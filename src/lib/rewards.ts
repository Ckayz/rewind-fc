/**
 * LP rewards SIMULATION — mirrors Polymarket's documented liquidity-rewards
 * program (quadratic spread scoring, one-sided ×1/3 penalty, daily epoch,
 * pro-rata pool share). No real orders or funds.
 */

export interface RewardMarket {
  id: string;
  title: string;
  flags: [string, string]; // country names for flag()
  poolPerDay: number; // USDC
  maxSpreadCents: number; // v
  minShares: number;
  competitionQ: number; // seeded aggregate score of other makers
  comp: "low" | "med" | "high";
}

export interface LpPosition {
  marketId: string;
  sizeUsd: number;
  spreadCents: number;
  twoSided: boolean;
}

const h01 = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function buildMarkets(
  fixtures: { fixtureId: string; p1: string; p2: string; stage: string }[]
): RewardMarket[] {
  const final = fixtures.find((f) => f.stage === "final");
  const markets: RewardMarket[] = [];
  if (final) {
    markets.push({
      id: `winner-${final.fixtureId}`,
      title: `${final.p1} v ${final.p2} — Match winner`,
      flags: [final.p1, final.p2],
      poolPerDay: 5000,
      maxSpreadCents: 3,
      minShares: 100,
      competitionQ: 8200,
      comp: "high",
    });
  }
  for (const f of fixtures.filter((x) => x.stage !== "final").slice(0, 8)) {
    const seed = Number(f.fixtureId) % 977;
    markets.push({
      id: `next5-${f.fixtureId}`,
      title: `${f.p1} v ${f.p2} — Next-5-min series`,
      flags: [f.p1, f.p2],
      poolPerDay: 500 + Math.round(h01(seed) * 9) * 250,
      maxSpreadCents: 3 + Math.round(h01(seed * 2) * 2),
      minShares: 50,
      competitionQ: 800 + Math.round(h01(seed * 3) * 4200),
      comp: h01(seed * 3) > 0.66 ? "high" : h01(seed * 3) > 0.33 ? "med" : "low",
    });
  }
  return markets;
}

/** Polymarket order score: S = ((v − s)/v)² ; one-sided books earn 1/3. */
export function positionScore(m: RewardMarket, p: LpPosition): number {
  const v = m.maxSpreadCents;
  const s = Math.min(p.spreadCents, v);
  const S = Math.pow((v - s) / v, 2);
  const q = S * p.sizeUsd;
  return p.twoSided ? q : q / 3;
}

export function estDaily(m: RewardMarket, p: LpPosition): number {
  const mine = positionScore(m, p);
  if (mine <= 0) return 0;
  const share = mine / (mine + m.competitionQ);
  const usd = m.poolPerDay * share;
  return usd < 1 ? 0 : usd; // $1 minimum payout, no rollover
}

export function shareOf(m: RewardMarket, p: LpPosition): number {
  const mine = positionScore(m, p);
  return mine / (mine + m.competitionQ);
}
