/**
 * TxLINE → Neon ingest.
 * Pulls all World Cup fixtures, full score histories (where retained),
 * odds movement windows, compiles replay timelines, upserts everything.
 *
 * Run: pnpm ingest   (loads .env.local via tsx --env-file, see package.json)
 */
import { readFileSync } from "node:fs";
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

interface ScoreRecord {
  FixtureId: number;
  Action: string;
  Ts: number;
  Seq: number;
  StatusId?: number;
  Clock?: { Running: boolean; Seconds: number };
  Data?: Record<string, unknown>;
  Stats?: Record<string, number>;
}

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

interface Compiled {
  meta: {
    fixtureId: string; p1: string; p2: string;
    kickoffTs: number; durationMs: number;
    finalScore?: { p1: number; p2: number; detail?: string };
  };
  items: TimelineItem[];
  anchors: { ts: number; clockMs: number }[];
}

function compileScores(fx: RawFixture, records: ScoreRecord[]): Compiled | null {
  const kickoffRec = records.find((r) => r.Action === "kickoff");
  const finalRec = [...records].reverse().find((r) => r.Action === "game_finalised");
  if (!kickoffRec) return null;
  const kickoffTs = kickoffRec.Ts;

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
          items.push({
            offsetMs: clockMs, kind: "score",
            payload: { type, team: tm, text: `${label} — ${tm === "p1" ? fx.Participant1 : fx.Participant2}` },
          });
        }
      }
      lastStats = { ...lastStats, ...r.Stats };
    }

    const t = team(r);
    const name = t === "p1" ? fx.Participant1 : t === "p2" ? fx.Participant2 : "";

    switch (r.Action) {
      case "shot": {
        const outcome = (r.Data as { Outcome?: string })?.Outcome;
        if (outcome === "OnTarget" || outcome === "Woodwork") {
          items.push({ offsetMs: clockMs, kind: "score", payload: { type: "shot", team: t, text: `${outcome === "Woodwork" ? "Off the woodwork" : "Shot on target"}${name ? ` — ${name}` : ""}` } });
        }
        break;
      }
      case "substitution":
        // Confirmed=false is the announce; the real sub follows with Confirmed=true
        if ((r as { Confirmed?: boolean }).Confirmed === true) {
          items.push({ offsetMs: clockMs, kind: "score", payload: { type: "substitution", team: t, text: `Substitution${name ? ` — ${name}` : ""}` } });
        }
        break;
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

  return {
    meta: { fixtureId: String(fx.FixtureId), p1: fx.Participant1, p2: fx.Participant2, kickoffTs, durationMs, finalScore },
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
  console.log("Fetching fixture list…");
  const fixtures = await fetchFixtures();
  console.log(`${fixtures.length} fixtures (comp ${WC_COMPETITION})`);

  let withHistory = 0;
  for (const fx of fixtures) {
    if (onlyMissing) {
      const rows = await sql`SELECT 1 FROM timelines WHERE fixture_id = ${String(fx.FixtureId)}`;
      if (rows.length > 0) { withHistory++; continue; }
    }
    const res = await get(`/api/scores/historical/${fx.FixtureId}`);
    const text = res.ok ? await res.text() : "";
    if (!text.trim()) {
      await upsertFixture(fx, false);
      console.log(`  ${fx.FixtureId} ${fx.Participant1} v ${fx.Participant2} — no history`);
      continue;
    }
    const records = parseSse(text);
    const compiled = compileScores(fx, records);
    if (!compiled) {
      await upsertFixture(fx, false);
      console.log(`  ${fx.FixtureId} — history but no kickoff record (${records.length} recs)`);
      continue;
    }
    const lastTs = records.at(-1)!.Ts;
    const oddsRecs = await fetchOddsWindow(fx.FixtureId, compiled.meta.kickoffTs - 2 * 3_600_000, lastTs);
    const oddsCount = mergeOdds(compiled, oddsRecs);
    await upsertFixture(fx, true, compiled.meta.finalScore);
    await upsertTimeline(compiled);
    withHistory++;
    console.log(`  ✓ ${fx.FixtureId} ${fx.Participant1} v ${fx.Participant2} — ${records.length} recs, ${oddsCount} odds ticks, final ${compiled.meta.finalScore?.p1}–${compiled.meta.finalScore?.p2}`);
    await sleep(150);
  }
  console.log(`Done. ${withHistory}/${fixtures.length} fixtures with replayable timelines.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
