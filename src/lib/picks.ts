import "server-only";
import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { fixtures, picks, users } from "@/db/schema";
import { getTimeline } from "@/lib/data";
import { foldTimeline } from "@/lib/replay/timeline";

export const POINTS = {
  winner: 100,
  hilo: 50,
  exactScore: 500,
  firstScorer: 300,
  liveMultiplier: 3,
} as const;

export interface PickSelection {
  pick?: "P1" | "X" | "P2"; // winner market
  stat?: "corners" | "goals"; // hilo market
  line?: number;
  side?: "over" | "under";
  scoreP1?: number; // exact_score market
  scoreP2?: number;
  playerId?: number; // first_scorer / mvp markets
  playerName?: string;
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

/** first goal event's scorer surname from a compiled timeline, if named */
function firstScorerName(
  tl: NonNullable<Awaited<ReturnType<typeof getTimeline>>>
): string | null {
  const goal = tl.items.find(
    (i) => i.kind === "score" && (i.payload as { type?: string }).type === "goal"
  );
  const text = (goal?.payload as { text?: string })?.text ?? "";
  const m = text.match(/^GOAL — (.+) \(/);
  return m ? m[1] : null;
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
    .where(and(eq(picks.status, "open"), isNull(picks.settledAt), ne(picks.market, "mvp")));

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

    if (p.market === "exact_score" && sel.scoreP1 !== undefined && sel.scoreP2 !== undefined) {
      correct = sel.scoreP1 === p.finalScore.p1 && sel.scoreP2 === p.finalScore.p2;
    } else if (p.market === "first_scorer" && sel.playerName) {
      if (!timelineCache.has(p.fixtureId)) {
        timelineCache.set(p.fixtureId, await getTimeline(p.fixtureId));
      }
      const tl = timelineCache.get(p.fixtureId);
      if (tl) {
        const scorer = firstScorerName(tl);
        if (scorer !== null) {
          correct = sel.playerName.toLowerCase().includes(scorer.toLowerCase());
        }
      }
    }

    if (correct === null) continue;
    const base =
      p.market === "winner"
        ? POINTS.winner
        : p.market === "exact_score"
          ? POINTS.exactScore
          : p.market === "first_scorer"
            ? POINTS.firstScorer
            : POINTS.hilo;
    const boostable = p.market === "winner" || p.market === "hilo";
    const pts = correct
      ? base * (boostable && p.mode === "live" ? POINTS.liveMultiplier : 1)
      : 0;
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
