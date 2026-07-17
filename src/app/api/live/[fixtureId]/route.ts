import { NextResponse } from "next/server";
import {
  getOddsSnapshot,
  getOddsUpdatesLive,
  getScoresSnapshot,
  getScoresUpdatesLive,
} from "@/lib/txline";
import { computeForecast, type ForecastInput } from "@/lib/forecast";

const ZONE_W: Record<string, number> = {
  SafePossession: 0.3, Possession: 0.3, AttackPossession: 1,
  DangerPossession: 2, HighDangerPossession: 3.5,
};

/** trailing 10-min momentum stats from raw live records */
function liveForecast(recs: {
  Ts?: number; Action?: string; Participant?: number;
  PossessionType?: string; StatusId?: number;
  Data?: Record<string, unknown>;
}[]) {
  const inPlay = recs.filter((r) => (r.StatusId ?? 0) >= 2 && (r.StatusId ?? 0) <= 12);
  if (inPlay.length < 10) return null;
  const maxTs = Math.max(...inPlay.map((r) => r.Ts ?? 0));
  const from = maxTs - 10 * 60_000;
  const win = inPlay.filter((r) => (r.Ts ?? 0) >= from);
  const input: ForecastInput = {
    pressureP1: 0, pressureP2: 0, shotsP1: 0, shotsP2: 0, corners: 0, cards: 0,
  };
  for (const r of win) {
    if (r.PossessionType && ZONE_W[r.PossessionType]) {
      if (r.Participant === 1) input.pressureP1 += ZONE_W[r.PossessionType];
      else if (r.Participant === 2) input.pressureP2 += ZONE_W[r.PossessionType];
    }
    if (r.Action === "shot") {
      if (r.Participant === 2) input.shotsP2++;
      else input.shotsP1++;
    } else if (r.Action === "corner") input.corners++;
    else if (r.Action === "yellow_card" || r.Action === "red_card") input.cards++;
  }
  return computeForecast(input);
}

const PHASE: Record<number, string> = {
  1: "Pre-match", 2: "First half", 3: "Half-time", 4: "Second half", 5: "Full-time",
  6: "Waiting for ET", 7: "Extra time 1st", 8: "ET break", 9: "Extra time 2nd",
  10: "Full-time (AET)", 11: "Waiting for pens", 12: "Penalties", 13: "Full-time (pens)",
};

interface ScoreRec {
  Action?: string; Ts?: number; Seq?: number; StatusId?: number;
  Clock?: { Running: boolean; Seconds: number };
  Stats?: Record<string, number>;
  Data?: Record<string, unknown>;
  Participant?: number;
  PossessionType?: string;
  Participant1Id?: number;
  Lineups?: {
    normativeId: number;
    preferredName: string;
    lineups: {
      rosterNumber: string;
      starter: boolean;
      positionId: number;
      player: { normativeId: number; preferredName: string };
    }[];
  }[];
}

function packLineups(recs: ScoreRec[]) {
  const lu = [...recs]
    .sort((a, b) => (b.Seq ?? 0) - (a.Seq ?? 0))
    .find((r) => r.Action === "lineups" && r.Lineups?.length);
  if (!lu?.Lineups) return null;
  const p1Id = lu.Participant1Id;
  const pack = (t: NonNullable<ScoreRec["Lineups"]>[number]) => ({
    team: t.preferredName,
    players: t.lineups.map((p) => ({
      id: p.player.normativeId,
      name: p.player.preferredName.split(", ").reverse().join(" "),
      num: p.rosterNumber,
      starter: p.starter,
      pos: p.positionId,
    })),
  });
  const sides = Object.fromEntries(
    lu.Lineups.map((t) => [t.normativeId === p1Id ? "p1" : "p2", pack(t)])
  );
  return sides.p1 && sides.p2 ? sides : null;
}

const ZONE: Record<string, string> = {
  SafePossession: "safe", Possession: "safe", AttackPossession: "attack",
  DangerPossession: "danger", HighDangerPossession: "box",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  const { fixtureId } = await params;
  try {
    const [scores, odds, scoreUpdates, oddsUpdates] = await Promise.allSettled([
      getScoresSnapshot(fixtureId) as Promise<ScoreRec[]>,
      getOddsSnapshot(fixtureId),
      getScoresUpdatesLive(fixtureId),
      getOddsUpdatesLive(fixtureId),
    ]);

    // merge snapshot with current-window catch-up feed (dedupe by Seq)
    const bySeq = new Map<number, ScoreRec>();
    for (const r of scores.status === "fulfilled" ? scores.value : []) {
      if (r.Seq !== undefined) bySeq.set(r.Seq, r);
    }
    for (const r of (scoreUpdates.status === "fulfilled"
      ? (scoreUpdates.value as ScoreRec[])
      : [])) {
      if (r.Seq !== undefined) bySeq.set(r.Seq, r);
    }
    const recs = [...bySeq.values()];
    const liveOddsCount =
      oddsUpdates.status === "fulfilled" ? oddsUpdates.value.length : 0;
    const latest = [...recs].sort((a, b) => (b.Seq ?? 0) - (a.Seq ?? 0))[0];
    const stats = recs.reduce<Record<string, number>>(
      (acc, r) => ({ ...acc, ...(r.Stats ?? {}) }),
      {}
    );

    let oddsOut: { home?: number; draw?: number; away?: number } | null = null;
    {
      interface OddsRec {
        SuperOddsType?: string; MarketPeriod?: string | null;
        PriceNames?: string[]; Prices?: number[]; Ts?: number;
      }
      const pool: OddsRec[] = [
        ...(odds.status === "fulfilled" ? (odds.value as OddsRec[]) : []),
        ...(oddsUpdates.status === "fulfilled"
          ? (oddsUpdates.value as OddsRec[])
          : []),
      ];
      const rec = pool
        .filter((o) => o.SuperOddsType === "1X2_PARTICIPANT_RESULT" && !o.MarketPeriod)
        .sort((a, b) => (b.Ts ?? 0) - (a.Ts ?? 0))[0];
      if (rec?.PriceNames && rec.Prices) {
        const at = (n: string) => {
          const i = rec.PriceNames!.indexOf(n);
          return i >= 0 && rec.Prices![i] ? rec.Prices![i] / 1000 : undefined;
        };
        oddsOut = { home: at("part1"), draw: at("draw"), away: at("part2") };
      }
    }

    const events = recs
      .filter((r) =>
        ["goal", "shot", "corner", "var", "penalty", "substitution", "kickoff", "yellow_card", "red_card"].includes(
          r.Action ?? ""
        )
      )
      .sort((a, b) => (b.Seq ?? 0) - (a.Seq ?? 0))
      .slice(0, 20)
      .map((r) => ({
        action: r.Action,
        seq: r.Seq,
        minute: r.Clock ? Math.floor(r.Clock.Seconds / 60) : null,
      }));

    return NextResponse.json(
      {
        ok: true,
        score: { p1: stats["1"] ?? 0, p2: stats["2"] ?? 0 },
        phase: PHASE[latest?.StatusId ?? 1] ?? "Pre-match",
        statusId: latest?.StatusId ?? 1,
        clockSeconds: latest?.Clock?.Seconds ?? null,
        odds: oddsOut,
        events,
        zone: (() => {
          const zr = [...recs]
            .sort((a, b) => (b.Seq ?? 0) - (a.Seq ?? 0))
            .find((r) => r.PossessionType && ZONE[r.PossessionType] && r.Participant);
          return zr
            ? { team: zr.Participant === 1 ? "p1" : "p2", z: ZONE[zr.PossessionType!] }
            : null;
        })(),
        lineups: packLineups(recs),
        forecast: liveForecast(recs),
        liveOddsUpdates: liveOddsCount,
        fetchedAt: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
