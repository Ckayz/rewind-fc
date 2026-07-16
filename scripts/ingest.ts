/**
 * TxLINE → Neon ingest.
 * Pulls all World Cup fixtures, full score histories (where retained),
 * odds movement windows, compiles replay timelines, upserts everything.
 *
 * Run: pnpm ingest   (loads .env.local via tsx --env-file, see package.json)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const BASE = process.env.TXLINE_BASE_URL ?? "https://txline.txodds.com";
const JWT = process.env.TXLINE_JWT!;
const TOKEN = process.env.TXLINE_API_TOKEN!;
const DB = process.env.DATABASE_URL!;
if (!JWT || !TOKEN || !DB) throw new Error("Missing env (TXLINE_JWT / TXLINE_API_TOKEN / DATABASE_URL)");

const sql = neon(DB);
const HEADERS = { Authorization: `Bearer ${JWT}`, "X-Api-Token": TOKEN };
const WC_COMPETITION = 72;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get(path: string): Promise<Response> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    return res;
  }
  throw new Error(`giving up on ${path}`);
}

async function getJson<T>(path: string): Promise<T> {
  const res = await get(path);
  if (!res.ok) throw new Error(`${res.status} ${path}: ${(await res.text()).slice(0, 120)}`);
  return res.json() as Promise<T>;
}

// ---------- fixtures ----------

interface RawFixture {
  FixtureId: number;
  CompetitionId: number;
  Participant1: string;
  Participant2: string;
  Participant1IsHome?: boolean;
  StartTime: number;
  GameState?: number;
}

function stageFor(startMs: number): { stage: string; group?: string } {
  const d = new Date(startMs).toISOString().slice(0, 10);
  if (d <= "2026-06-27") return { stage: "group" };
  if (d <= "2026-07-03") return { stage: "r32" };
  if (d <= "2026-07-08") return { stage: "r16" };
  if (d <= "2026-07-12") return { stage: "qf" };
  if (d <= "2026-07-16") return { stage: "sf" };
  if (d === "2026-07-18") return { stage: "bronze" };
  return { stage: "final" };
}

async function fetchFixtures(): Promise<RawFixture[]> {
  const d1 = Math.floor(Date.UTC(2026, 5, 10) / 86_400_000);
  const d2 = Math.floor(Date.UTC(2026, 6, 10) / 86_400_000);
  const [a, b] = await Promise.all([
    getJson<RawFixture[]>(`/api/fixtures/snapshot?startEpochDay=${d1}&competitionId=${WC_COMPETITION}`),
    getJson<RawFixture[]>(`/api/fixtures/snapshot?startEpochDay=${d2}&competitionId=${WC_COMPETITION}`),
  ]);
  const map = new Map<number, RawFixture>();
  for (const f of [...a, ...b]) map.set(f.FixtureId, f);
  return [...map.values()].sort((x, y) => x.StartTime - y.StartTime);
}

// ---------- score history ----------

interface LineupPlayer {
  fixturePlayerId: number;
  rosterNumber: string;
  starter: boolean;
  positionId: number;
  player: { normativeId: number; preferredName: string; country?: string };
}

interface LineupTeam {
  normativeId: number;
  preferredName: string;
  lineups: LineupPlayer[];
}

interface ScoreRecord {
  FixtureId: number;
  Action: string;
  Ts: number;
  Seq: number;
  StatusId?: number;
  Clock?: { Running: boolean; Seconds: number };
  Data?: Record<string, unknown>;
  Stats?: Record<string, number>;
  Lineups?: LineupTeam[];
  PlayerStats?: Record<string, Record<string, Record<string, number>>>;
  Participant1Id?: number;
  Participant2Id?: number;
}

/** "Gordon, Anthony" → "Anthony Gordon" */
const displayName = (n: string) => {
  const [last, first] = n.split(", ");
  return first ? `${first} ${last}` : n;
};
const shortName = (n: string) => n.split(", ")[0];

function parseSse(text: string): ScoreRecord[] {
  const out: ScoreRecord[] = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) continue;
    try {
      out.push(JSON.parse(line.slice(5)));
    } catch {
      /* skip malformed line */
    }
  }
  out.sort((a, b) => a.Seq - b.Seq);
  return out;
}

const PHASE_LABEL: Record<number, string> = {
  1: "Pre-match", 2: "First half", 3: "Half-time", 4: "Second half", 5: "Full-time",
  6: "Waiting for extra time", 7: "Extra time — 1st", 8: "ET break", 9: "Extra time — 2nd",
  10: "Full-time (AET)", 11: "Waiting for penalties", 12: "Penalty shootout", 13: "Full-time (pens)",
  14: "Interrupted", 15: "Abandoned",
};

interface TimelineItem {
  offsetMs: number;
  kind: "score" | "odds" | "phase";
  payload: Record<string, unknown>;
}

export interface MetaLineups {
  p1: { team: string; players: { id: number; name: string; num: string; starter: boolean }[] };
  p2: { team: string; players: { id: number; name: string; num: string; starter: boolean }[] };
}

export interface MetaPlayerStat {
  id: number;
  name: string;
  team: "p1" | "p2";
  stats: Record<string, number>;
}

interface Compiled {
  meta: {
    fixtureId: string; p1: string; p2: string;
    kickoffTs: number; durationMs: number;
    finalScore?: { p1: number; p2: number; detail?: string };
    lineups?: MetaLineups;
    playerStats?: MetaPlayerStat[];
  };
  items: TimelineItem[];
  anchors: { ts: number; clockMs: number }[];
}

function compileScores(fx: RawFixture, records: ScoreRecord[]): Compiled | null {
  const kickoffRec = records.find((r) => r.Action === "kickoff");
  const finalRec = [...records].reverse().find((r) => r.Action === "game_finalised");
  if (!kickoffRec) return null;
  const kickoffTs = kickoffRec.Ts;

  // ---- player layer: lineups, id→name map, team sides ----
  const lineupRec = [...records].reverse().find((r) => r.Action === "lineups" && r.Lineups?.length);
  const playerName = new Map<number, string>();
  const playerTeam = new Map<number, "p1" | "p2">();
  let metaLineups: MetaLineups | undefined;
  if (lineupRec?.Lineups) {
    const p1Id = lineupRec.Participant1Id;
    const sides = lineupRec.Lineups.map((t) => ({
      side: (t.normativeId === p1Id ? "p1" : "p2") as "p1" | "p2",
      t,
    }));
    const pack = (t: LineupTeam) =>
      t.lineups.map((p) => {
        playerName.set(p.player.normativeId, p.player.preferredName);
        return {
          id: p.player.normativeId,
          name: displayName(p.player.preferredName),
          num: p.rosterNumber,
          starter: p.starter,
        };
      });
    const bySide = Object.fromEntries(
      sides.map(({ side, t }) => {
        const players = pack(t);
        for (const p of t.lineups) playerTeam.set(p.player.normativeId, side);
        return [side, { team: t.preferredName, players }];
      })
    ) as unknown as MetaLineups;
    if (bySide.p1 && bySide.p2) metaLineups = bySide;
  }
  const nameOf = (id?: unknown): string | undefined =>
    typeof id === "number" ? playerName.get(id) : undefined;

  // scorer attributions from raw goal actions (consumed by stat-delta goals)
  const goalAttrib: { clockMs: number; playerId: number; used: boolean }[] = [];

  const items: TimelineItem[] = [];
  const anchors: { ts: number; clockMs: number }[] = [];
  let lastClockMs = 0;
  let lastStatus = 0;
  let lastStats: Record<string, number> = {};

  const clockOf = (r: ScoreRecord): number => {
    let ms: number | null = null;
    if (r.Clock && typeof r.Clock.Seconds === "number") ms = r.Clock.Seconds * 1000;
    if (ms === null || ms < lastClockMs) ms = lastClockMs;
    lastClockMs = Math.max(lastClockMs, ms);
    return ms;
  };

  const team = (r: ScoreRecord): "p1" | "p2" | undefined => {
    const p = (r.Data as { Participant?: number | string })?.Participant;
    if (p === 1 || p === "1" || p === "Participant1") return "p1";
    if (p === 2 || p === "2" || p === "Participant2") return "p2";
    return undefined;
  };

  // prepass: collect goal-scorer attributions with their clock positions
  {
    let preClock = 0;
    for (const r of records) {
      if (r.Clock?.Seconds !== undefined) preClock = Math.max(preClock, r.Clock.Seconds * 1000);
      const pid = (r.Data as { PlayerId?: number })?.PlayerId;
      if (r.Action === "goal" && typeof pid === "number") {
        goalAttrib.push({ clockMs: preClock, playerId: pid, used: false });
      }
    }
  }
  const scorerFor = (clockMs: number, side: "p1" | "p2"): string | undefined => {
    for (const a of goalAttrib) {
      if (a.used || Math.abs(a.clockMs - clockMs) > 180_000) continue;
      if (playerTeam.size > 0 && playerTeam.get(a.playerId) !== side) continue;
      a.used = true;
      return nameOf(a.playerId);
    }
    return undefined;
  };

  for (const r of records) {
    const clockMs = clockOf(r);
    if (r.Clock?.Seconds !== undefined) anchors.push({ ts: r.Ts, clockMs });

    // phase transitions
    if (r.StatusId && r.StatusId !== lastStatus && PHASE_LABEL[r.StatusId]) {
      lastStatus = r.StatusId;
      items.push({
        offsetMs: clockMs, kind: "phase",
        payload: { label: PHASE_LABEL[r.StatusId], statusId: r.StatusId, finished: r.StatusId >= 5 && r.StatusId <= 13 && [5, 10, 13].includes(r.StatusId) },
      });
    }

    // goals + cards from total-stat deltas — the authoritative source.
    // Raw `goal` actions triple-fire (announce / stats-bump / player enrichment)
    // and include never-confirmed strays, so they are NOT used for scoring.
    if (r.Stats && Object.keys(r.Stats).length > 0) {
      for (const [key, type, label, tm] of [
        ["1", "goal", "GOAL", "p1"], ["2", "goal", "GOAL", "p2"],
        ["3", "yellow", "Yellow card", "p1"], ["4", "yellow", "Yellow card", "p2"],
        ["5", "red", "Red card", "p1"], ["6", "red", "Red card", "p2"],
        ["7", "corner", "Corner", "p1"], ["8", "corner", "Corner", "p2"],
      ] as const) {
        const prev = lastStats[key] ?? 0;
        const cur = r.Stats[key] ?? prev;
        for (let n = prev; n < cur; n++) {
          const teamName = tm === "p1" ? fx.Participant1 : fx.Participant2;
          let text = `${label} — ${teamName}`;
          if (type === "goal") {
            const scorer = scorerFor(clockMs, tm);
            if (scorer) text = `GOAL — ${shortName(scorer)} (${teamName})`;
          }
          items.push({
            offsetMs: clockMs, kind: "score",
            payload: { type, team: tm, text },
          });
        }
      }
      lastStats = { ...lastStats, ...r.Stats };
    }

    const t = team(r);
    const name = t === "p1" ? fx.Participant1 : t === "p2" ? fx.Participant2 : "";

    switch (r.Action) {
      case "shot": {
        const d = r.Data as { Outcome?: string; PlayerId?: number };
        if (d?.Outcome === "OnTarget" || d?.Outcome === "Woodwork") {
          const who = nameOf(d.PlayerId);
          const label = d.Outcome === "Woodwork" ? "Off the woodwork" : "Shot on target";
          items.push({
            offsetMs: clockMs, kind: "score",
            payload: { type: "shot", team: t, text: `${label}${who ? ` — ${shortName(who)}` : name ? ` — ${name}` : ""}` },
          });
        }
        break;
      }
      case "substitution": {
        // Confirmed=false is the announce; the real sub follows with Confirmed=true
        if ((r as { Confirmed?: boolean }).Confirmed !== true) break;
        const d = r.Data as { PlayerInId?: number; PlayerOutId?: number };
        const inName = nameOf(d?.PlayerInId);
        const outName = nameOf(d?.PlayerOutId);
        const text =
          inName && outName
            ? `Sub — ${shortName(inName)} on for ${shortName(outName)}${name ? ` (${name})` : ""}`
            : `Substitution${name ? ` — ${name}` : ""}`;
        items.push({ offsetMs: clockMs, kind: "score", payload: { type: "substitution", team: t, text } });
        break;
      }
      case "var": {
        const vtype = (r.Data as { Type?: string })?.Type;
        items.push({ offsetMs: clockMs, kind: "score", payload: { type: "var", text: `VAR check${vtype ? ` — ${vtype}` : ""}` } });
        break;
      }
      case "var_end": {
        const out = (r.Data as { Outcome?: string })?.Outcome;
        items.push({ offsetMs: clockMs, kind: "score", payload: { type: "var", text: `VAR: ${out === "Overturned" ? "decision overturned" : "decision stands"}` } });
        break;
      }
      case "penalty": {
        const out = (r.Data as { Outcome?: string })?.Outcome;
        items.push({ offsetMs: clockMs, kind: "score", payload: { type: "penalty", team: t, text: `Penalty ${out ?? ""}${name ? ` — ${name}` : ""}`.trim() } });
        break;
      }
    }
  }

  const durationMs = Math.max(lastClockMs, 90 * 60_000);
  const finalStats = finalRec?.Stats ?? lastStats;
  const finalScore = finalRec
    ? { p1: finalStats["1"] ?? 0, p2: finalStats["2"] ?? 0, detail: pensDetail(finalStats, lastStatus) }
    : undefined;

  // per-player final stats from the finalise record, name-resolved
  let playerStats: MetaPlayerStat[] | undefined;
  if (finalRec?.PlayerStats) {
    playerStats = [];
    for (const [part, side] of [["Participant1", "p1"], ["Participant2", "p2"]] as const) {
      for (const [idStr, stats] of Object.entries(finalRec.PlayerStats[part] ?? {})) {
        const id = Number(idStr);
        const nm = playerName.get(id);
        playerStats.push({
          id,
          name: nm ? displayName(nm) : `#${id}`,
          team: side,
          stats: stats as Record<string, number>,
        });
      }
    }
    if (playerStats.length === 0) playerStats = undefined;
  }

  return {
    meta: {
      fixtureId: String(fx.FixtureId), p1: fx.Participant1, p2: fx.Participant2,
      kickoffTs, durationMs, finalScore,
      lineups: metaLineups, playerStats,
    },
    items, anchors,
  };
}

function pensDetail(stats: Record<string, number>, status: number): string | undefined {
  const p1 = stats["6001"], p2 = stats["6002"];
  if (status === 13 && p1 !== undefined && p2 !== undefined) return `${p1}–${p2} on penalties`;
  if (status === 10) return "after extra time";
  return undefined;
}

// ---------- odds ----------

interface OddsRecord {
  MessageId?: number; Ts: number; FixtureId?: number;
  SuperOddsType?: string; MarketPeriod?: string | null;
  PriceNames?: string[]; Prices?: number[];
}

async function fetchOddsWindow(fixtureId: number, fromTs: number, toTs: number): Promise<OddsRecord[]> {
  const out: OddsRecord[] = [];
  const seen = new Set<number>();
  for (let ts = fromTs; ts <= toTs; ts += 5 * 60_000) {
    const epochDay = Math.floor(ts / 86_400_000);
    const hour = Math.floor((ts % 86_400_000) / 3_600_000);
    const interval = Math.floor((ts % 3_600_000) / (5 * 60_000));
    try {
      const res = await get(`/api/odds/updates/${epochDay}/${hour}/${interval}?fixtureId=${fixtureId}`);
      if (!res.ok) continue;
      const arr = (await res.json()) as OddsRecord[];
      for (const o of arr) {
        if (o.FixtureId !== undefined && o.FixtureId !== fixtureId) continue;
        const id = o.MessageId ?? o.Ts;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(o);
      }
    } catch {
      /* skip bucket */
    }
  }
  return out.sort((a, b) => a.Ts - b.Ts);
}

function tsToClockMs(ts: number, anchors: { ts: number; clockMs: number }[], kickoffTs: number): number {
  if (ts <= kickoffTs) return 0;
  let best = { ts: kickoffTs, clockMs: 0 };
  for (const a of anchors) {
    if (a.ts <= ts && a.ts >= best.ts) best = a;
  }
  return best.clockMs; // snap to last known clock anchor (skips halftime dead air)
}

function mergeOdds(c: Compiled, odds: OddsRecord[]) {
  let count = 0;
  for (const o of odds) {
    if (o.SuperOddsType !== "1X2_PARTICIPANT_RESULT") continue;
    if (o.MarketPeriod) continue; // full-game market only
    const names = o.PriceNames ?? [];
    const prices = o.Prices ?? [];
    const get = (n: string) => {
      const i = names.indexOf(n);
      return i >= 0 && prices[i] ? prices[i] / 1000 : undefined;
    };
    const home = get("part1"), draw = get("draw"), away = get("part2");
    if (!home && !draw && !away) continue;
    c.items.push({
      offsetMs: o.Ts < c.meta.kickoffTs ? 0 : tsToClockMs(o.Ts, c.anchors, c.meta.kickoffTs),
      kind: "odds",
      payload: { home, draw, away },
    });
    count++;
  }
  c.items.sort((a, b) => a.offsetMs - b.offsetMs);
  return count;
}

// ---------- db ----------

async function upsertFixture(f: RawFixture, hasTimeline: boolean, finalScore?: object) {
  const { stage } = stageFor(f.StartTime);
  await sql`
    INSERT INTO fixtures (fixture_id, p1, p2, p1_is_home, start_time, game_state, stage, final_score, has_timeline)
    VALUES (${String(f.FixtureId)}, ${f.Participant1}, ${f.Participant2}, ${f.Participant1IsHome ?? true},
            ${new Date(f.StartTime).toISOString()}, ${f.GameState ?? 1}, ${stage},
            ${finalScore ? JSON.stringify(finalScore) : null}, ${hasTimeline})
    ON CONFLICT (fixture_id) DO UPDATE SET
      p1 = EXCLUDED.p1, p2 = EXCLUDED.p2, start_time = EXCLUDED.start_time,
      game_state = EXCLUDED.game_state, stage = EXCLUDED.stage,
      final_score = COALESCE(EXCLUDED.final_score, fixtures.final_score),
      has_timeline = fixtures.has_timeline OR EXCLUDED.has_timeline
  `;
}

async function upsertTimeline(c: Compiled) {
  const compiled = { meta: c.meta, items: c.items };
  await sql`
    INSERT INTO timelines (fixture_id, compiled, item_count, kickoff_ts, duration_ms)
    VALUES (${c.meta.fixtureId}, ${JSON.stringify(compiled)}, ${c.items.length},
            ${new Date(c.meta.kickoffTs).toISOString()}, ${c.meta.durationMs})
    ON CONFLICT (fixture_id) DO UPDATE SET
      compiled = EXCLUDED.compiled, item_count = EXCLUDED.item_count,
      kickoff_ts = EXCLUDED.kickoff_ts, duration_ms = EXCLUDED.duration_ms,
      ingested_at = now()
  `;
}

// ---------- main ----------

async function main() {
  const onlyMissing = process.argv.includes("--missing");
  // --recompile: rebuild score/player layers from archived raw files and
  // reuse odds ticks already stored in the DB (no odds window refetch)
  const recompile = process.argv.includes("--recompile");
  mkdirSync("data/raw", { recursive: true });
  console.log("Fetching fixture list…");
  const fixtures = await fetchFixtures();
  console.log(`${fixtures.length} fixtures (comp ${WC_COMPETITION})`);

  let withHistory = 0;
  for (const fx of fixtures) {
    const id = String(fx.FixtureId);
    if (onlyMissing) {
      const rows = await sql`SELECT 1 FROM timelines WHERE fixture_id = ${id}`;
      if (rows.length > 0) { withHistory++; continue; }
    }

    // raw source: archived file first (retention-proof), API second (+archive)
    const rawPath = `data/raw/scores-${id}.sse`;
    let text = "";
    if (existsSync(rawPath)) {
      text = readFileSync(rawPath, "utf8");
    } else {
      const res = await get(`/api/scores/historical/${id}`);
      text = res.ok ? await res.text() : "";
      if (text.trim()) writeFileSync(rawPath, text);
    }
    if (!text.trim()) {
      await upsertFixture(fx, false);
      console.log(`  ${id} ${fx.Participant1} v ${fx.Participant2} — no history`);
      continue;
    }
    const records = parseSse(text);
    const compiled = compileScores(fx, records);
    if (!compiled) {
      await upsertFixture(fx, false);
      console.log(`  ${id} — history but no kickoff record (${records.length} recs)`);
      continue;
    }

    let oddsCount = 0;
    let reusedOdds = false;
    if (recompile) {
      const rows = (await sql`SELECT compiled FROM timelines WHERE fixture_id = ${id}`) as {
        compiled: { items: TimelineItem[] };
      }[];
      const stored = rows[0]?.compiled.items.filter((i) => i.kind === "odds") ?? [];
      if (stored.length > 0) {
        compiled.items.push(...stored);
        compiled.items.sort((a, b) => a.offsetMs - b.offsetMs);
        oddsCount = stored.length;
        reusedOdds = true;
      }
    }
    if (!reusedOdds) {
      const lastTs = records.at(-1)!.Ts;
      const oddsRecs = await fetchOddsWindow(fx.FixtureId, compiled.meta.kickoffTs - 2 * 3_600_000, lastTs);
      oddsCount = mergeOdds(compiled, oddsRecs);
    }

    await upsertFixture(fx, true, compiled.meta.finalScore);
    await upsertTimeline(compiled);
    withHistory++;
    console.log(
      `  ✓ ${id} ${fx.Participant1} v ${fx.Participant2} — ${records.length} recs, ${oddsCount} odds ticks${reusedOdds ? " (reused)" : ""}, lineups ${compiled.meta.lineups ? "✓" : "—"}, final ${compiled.meta.finalScore?.p1}–${compiled.meta.finalScore?.p2}`
    );
    await sleep(recompile ? 20 : 150);
  }
  console.log(`Done. ${withHistory}/${fixtures.length} fixtures with replayable timelines.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
