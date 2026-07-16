import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { fixtures, picks, users } from "@/db/schema";
import { getTimeline } from "@/lib/data";
import { foldTimeline } from "@/lib/replay/timeline";

export const POINTS = { winner: 100, hilo: 50, liveMultiplier: 3 } as const;

export interface PickSelection {
  pick?: "P1" | "X" | "P2"; // winner market
  stat?: "corners" | "goals"; // hilo market
  line?: number;
  side?: "over" | "under";
}

export function canonicalPickMessage(
  wallet: string,
  fixtureId: string,
  market: string,
  selection: PickSelection
): string {
  return `Rewind FC pick\nWallet: ${wallet}\nFixture: ${fixtureId}\nMarket: ${market}\nSelection: ${JSON.stringify(selection)}`;
}

export function marketKeyOf(market: string, selection: PickSelection): string {
  return market === "hilo" ? `hilo:${selection.stat}` : market;
}

/** Settle all open picks whose fixtures have results. Lazy — called from leaderboard/picks reads. */
export async function settleOpenPicks(): Promise<number> {
  const open = await db
    .select({
      id: picks.id,
      fixtureId: picks.fixtureId,
      mode: picks.mode,
      market: picks.market,
      selection: picks.selection,
      finalScore: fixtures.finalScore,
    })
    .from(picks)
    .innerJoin(fixtures, eq(picks.fixtureId, fixtures.fixtureId))
    .where(and(eq(picks.status, "open"), isNull(picks.settledAt)));

  let settled = 0;
  const timelineCache = new Map<string, Awaited<ReturnType<typeof getTimeline>>>();

  for (const p of open) {
    if (!p.finalScore) continue; // not finished yet
    const sel = p.selection as PickSelection;
    let correct: boolean | null = null;

    if (p.market === "winner") {
      let outcome: "P1" | "X" | "P2";
      if (p.finalScore.p1 > p.finalScore.p2) outcome = "P1";
      else if (p.finalScore.p2 > p.finalScore.p1) outcome = "P2";
      else {
        // knockout draw → penalties decide; detail is "a–b on penalties" in p1–p2 order
        const m = p.finalScore.detail?.match(/(\d+)–(\d+) on penalties/);
        outcome = m ? (Number(m[1]) > Number(m[2]) ? "P1" : "P2") : "X";
      }
      correct = sel.pick === outcome;
    } else if (p.market === "hilo" && sel.stat && sel.line !== undefined && sel.side) {
      let total: number | null = null;
      if (sel.stat === "goals") {
        total = p.finalScore.p1 + p.finalScore.p2;
      } else {
        if (!timelineCache.has(p.fixtureId)) {
          timelineCache.set(p.fixtureId, await getTimeline(p.fixtureId));
        }
        const tl = timelineCache.get(p.fixtureId);
        if (tl) {
          const folded = foldTimeline(tl, tl.meta.durationMs);
          total = folded.events.filter((e) => e.type === "corner").length;
        }
      }
      if (total !== null) {
        correct = sel.side === "over" ? total > sel.line : total < sel.line;
      }
    }

    if (correct === null) continue;
    const base = p.market === "winner" ? POINTS.winner : POINTS.hilo;
    const pts = correct ? base * (p.mode === "live" ? POINTS.liveMultiplier : 1) : 0;
    await db
      .update(picks)
      .set({ status: correct ? "won" : "lost", points: pts, settledAt: new Date() })
      .where(eq(picks.id, p.id));
    settled++;
  }
  return settled;
}

export async function ensureUser(wallet: string) {
  await db.insert(users).values({ wallet }).onConflictDoNothing();
}
