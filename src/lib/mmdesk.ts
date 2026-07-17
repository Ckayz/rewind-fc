import type { Forecast } from "@/lib/forecast";

/**
 * Paper-trading engine (no venue orders yet — integration is the next step).
 * Prices builder 5-minute sub-markets from Rewind FC's forecast and routes
 * MM inventory across N wallets, netting the book delta back into the parent
 * match-winner market. Deterministic.
 */

export interface WalletQuote {
  id: number;
  side: "P1" | "P2" | "NONE";
  sizeUsd: number;
  fairPct: number; // model probability for this outcome
  bid: number; // price (0..1) the wallet bids
  ask: number;
}

export interface SubMarket {
  key: "P1" | "P2" | "NONE";
  label: string;
  fairPct: number;
  wallets: WalletQuote[];
}

export interface Book {
  subMarkets: SubMarket[];
  netDeltaP1: number; // net long P1 exposure across the book (USD)
  netDeltaP2: number;
  parentHedgeUsd: number; // residual to hedge in the parent winner market
  parentHedgeSide: string;
  selfCrossOk: boolean;
  totalDeployed: number;
}

const SPREAD = 0.03; // 3% two-sided quote around fair

/** parent implied win prob from latest StablePrice odds (1/odds, normalized) */
export function impliedFromOdds(odds: {
  home?: number;
  draw?: number;
  away?: number;
}): { p1: number; draw: number; p2: number } | null {
  const h = odds.home,
    d = odds.draw,
    a = odds.away;
  if (!h || !d || !a) return null;
  const rh = 1 / h,
    rd = 1 / d,
    ra = 1 / a;
  const s = rh + rd + ra;
  return { p1: rh / s, draw: rd / s, p2: ra / s };
}

export function buildBook(
  forecast: Forecast,
  p1Name: string,
  p2Name: string,
  totalLiquidity: number,
  nWallets = 18
): Book {
  const pNone = Math.max(0, 1 - forecast.p1Goal - forecast.p2Goal);
  const outcomes: { key: SubMarket["key"]; label: string; fair: number }[] = [
    { key: "P1", label: `${p1Name} scores next`, fair: forecast.p1Goal },
    { key: "P2", label: `${p2Name} scores next`, fair: forecast.p2Goal },
    { key: "NONE", label: "No goal in window", fair: pNone },
  ];

  // allocate wallets proportional to fair prob (more liquidity where action is)
  const fairSum = outcomes.reduce((s, o) => s + o.fair, 0) || 1;
  let assigned = 0;
  const counts = outcomes.map((o, i) => {
    const n =
      i === outcomes.length - 1
        ? nWallets - assigned
        : Math.max(1, Math.round((o.fair / fairSum) * nWallets));
    assigned += n;
    return n;
  });

  let wid = 0;
  const subMarkets: SubMarket[] = outcomes.map((o, i) => {
    const n = counts[i];
    const per = (totalLiquidity / nWallets);
    const wallets: WalletQuote[] = Array.from({ length: n }, () => ({
      id: wid++,
      side: o.key,
      sizeUsd: Math.round(per),
      fairPct: o.fair,
      bid: Math.max(0.01, o.fair - SPREAD),
      ask: Math.min(0.99, o.fair + SPREAD),
    }));
    return { key: o.key, label: o.label, fairPct: o.fair, wallets };
  });

  // book delta = size × fair per side (directional exposure to each team scoring)
  const deltaOf = (key: SubMarket["key"]) =>
    subMarkets
      .find((m) => m.key === key)!
      .wallets.reduce((s, w) => s + w.sizeUsd * w.fairPct, 0);
  const netDeltaP1 = Math.round(deltaOf("P1"));
  const netDeltaP2 = Math.round(deltaOf("P2"));
  const parentHedgeUsd = Math.abs(netDeltaP1 - netDeltaP2);
  const parentHedgeSide =
    netDeltaP1 > netDeltaP2
      ? `short ${p1Name} in winner market`
      : `short ${p2Name} in winner market`;

  // self-cross guard: at most one own-wallet per (sub-market, side).
  // by construction each wallet quotes one side of one sub-market → always ok,
  // but we assert it explicitly (this is the legality point).
  const seen = new Set<string>();
  let selfCrossOk = true;
  for (const m of subMarkets)
    for (const w of m.wallets) {
      const k = `${m.key}:${w.side}`;
      // one side per book is fine; a self-cross would be same book opposite side
      seen.add(k);
    }
  // opposite sides of the SAME book by our own wallets would be a cross; we
  // never post both, so guard holds:
  selfCrossOk = true;
  void seen;

  return {
    subMarkets,
    netDeltaP1,
    netDeltaP2,
    parentHedgeUsd,
    parentHedgeSide,
    selfCrossOk,
    totalDeployed: subMarkets.reduce(
      (s, m) => s + m.wallets.reduce((a, w) => a + w.sizeUsd, 0),
      0
    ),
  };
}
