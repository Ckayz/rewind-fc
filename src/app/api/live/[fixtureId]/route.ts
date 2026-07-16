import { NextResponse } from "next/server";
import {
  getOddsSnapshot,
  getOddsUpdatesLive,
  getScoresSnapshot,
  getScoresUpdatesLive,
} from "@/lib/txline";

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
}

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
