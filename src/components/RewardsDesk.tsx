"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  buildMarkets,
  estDaily,
  shareOf,
  type LpPosition,
  type RewardMarket,
} from "@/lib/rewards";
import { flag } from "@/lib/flags";

const LS_KEY = "rewindfc_lp";

function Provide({
  m,
  onConfirm,
  onClose,
}: {
  m: RewardMarket;
  onConfirm: (p: LpPosition) => void;
  onClose: () => void;
}) {
  const [size, setSize] = useState(5_000);
  const [spread, setSpread] = useState(1);
  const [twoSided, setTwoSided] = useState(true);
  const pos: LpPosition = { marketId: m.id, sizeUsd: size, spreadCents: spread, twoSided };
  const est = estDaily(m, pos);

  return (
    <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-2 text-pitch-400">
          Size
          <input
            type="range"
            min={m.minShares}
            max={50_000}
            step={500}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-32 accent-[#2d6cff]"
          />
          <span className="score-digits text-sm text-pitch-50">
            ${(size / 1000).toFixed(1)}k
          </span>
        </label>
        <label className="flex items-center gap-2 text-pitch-400">
          Spread
          <input
            type="range"
            min={0}
            max={m.maxSpreadCents}
            step={0.5}
            value={spread}
            onChange={(e) => setSpread(Number(e.target.value))}
            className="w-24 accent-[#2d6cff]"
          />
          <span className="score-digits text-sm text-pitch-50">{spread}¢</span>
        </label>
        <label className="flex items-center gap-1.5 text-pitch-400">
          <input
            type="checkbox"
            checked={twoSided}
            onChange={(e) => setTwoSided(e.target.checked)}
            className="accent-[#2d6cff]"
          />
          two-sided {!twoSided && <span className="text-danger">(×⅓)</span>}
        </label>
        <span className="ml-auto text-pitch-400">
          est.{" "}
          <span className="score-digits text-base text-success">
            ${est.toFixed(2)}
          </span>
          /day
        </span>
        <button
          onClick={() => onConfirm(pos)}
          className="rounded-lg bg-accent px-4 py-1.5 font-semibold text-white hover:opacity-90"
        >
          Provide
        </button>
        <button onClick={onClose} className="text-pitch-400 hover:text-pitch-50">
          ✕
        </button>
      </div>
    </div>
  );
}

export function RewardsDesk({
  fixtures,
}: {
  fixtures: { fixtureId: string; p1: string; p2: string; stage: string }[];
}) {
  const markets = useMemo(() => buildMarkets(fixtures), [fixtures]);
  const [positions, setPositions] = useState<Record<string, LpPosition>>({});
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setPositions(JSON.parse(raw));
    } catch {}
  }, []);
  const save = (next: Record<string, LpPosition>) => {
    setPositions(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const totals = useMemo(() => {
    let liquidity = 0;
    let daily = 0;
    for (const m of markets) {
      const p = positions[m.id];
      if (p) {
        liquidity += p.sizeUsd;
        daily += estDaily(m, p);
      }
    }
    return {
      pool: markets.reduce((s, m) => s + m.poolPerDay, 0),
      liquidity,
      daily,
    };
  }, [markets, positions]);

  return (
    <div className="flex flex-col gap-4">
      {/* summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["Daily rewards pool", `$${totals.pool.toLocaleString()}`, "text-pitch-50"],
            ["Your liquidity", `$${totals.liquidity.toLocaleString()}`, "text-accent"],
            ["Est. daily earnings", `$${totals.daily.toFixed(2)}`, "text-success"],
          ] as const
        ).map(([label, value, cls]) => (
          <div key={label} className="glass rounded-xl px-4 py-3">
            <p className="text-xs text-pitch-400">{label}</p>
            <p className={`score-digits text-3xl ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* markets table */}
      <div className="glass overflow-hidden rounded-xl">
        <div className="hidden grid-cols-[2.2fr_1fr_0.8fr_0.8fr_0.7fr_1fr_1fr_auto] gap-2 border-b border-pitch-700/50 px-4 py-2.5 text-[11px] font-semibold text-pitch-400 md:grid">
          <span>Market</span>
          <span className="text-right">Reward / day</span>
          <span className="text-right">Max spread</span>
          <span className="text-right">Min shares</span>
          <span className="text-right">Comp</span>
          <span className="text-right">Your share</span>
          <span className="text-right">Your est / day</span>
          <span />
        </div>
        {markets.map((m, i) => {
          const p = positions[m.id];
          const share = p ? shareOf(m, p) : 0;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="border-b border-pitch-700/30 px-4 py-3 last:border-0"
            >
              <div className="grid items-center gap-2 md:grid-cols-[2.2fr_1fr_0.8fr_0.8fr_0.7fr_1fr_1fr_auto]">
                <span className="truncate text-sm font-medium text-pitch-50">
                  {flag(m.flags[0])}{flag(m.flags[1])} {m.title}
                </span>
                <span className="score-digits text-right text-sm text-pitch-50">
                  ${m.poolPerDay.toLocaleString()}
                </span>
                <span className="text-right text-sm text-pitch-300">
                  {m.maxSpreadCents}¢
                </span>
                <span className="text-right text-sm text-pitch-300">
                  {m.minShares}
                </span>
                <span
                  className={`text-right text-xs font-semibold ${
                    m.comp === "high"
                      ? "text-danger"
                      : m.comp === "med"
                        ? "text-gold"
                        : "text-success"
                  }`}
                >
                  {m.comp}
                </span>
                <span className="text-right">
                  {p ? (
                    <span className="text-sm text-accent">
                      {(share * 100).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-sm text-pitch-600">—</span>
                  )}
                </span>
                <span className="score-digits text-right text-sm text-success">
                  {p ? `$${estDaily(m, p).toFixed(2)}` : "—"}
                </span>
                <span className="text-right">
                  {p ? (
                    <button
                      onClick={() => {
                        const next = { ...positions };
                        delete next[m.id];
                        save(next);
                      }}
                      className="rounded-lg border border-pitch-700 px-3 py-1 text-xs text-pitch-300 hover:border-danger hover:text-danger"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => setOpen(open === m.id ? null : m.id)}
                      className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                    >
                      Provide
                    </button>
                  )}
                </span>
              </div>
              {open === m.id && !p && (
                <Provide
                  m={m}
                  onConfirm={(pos) => {
                    save({ ...positions, [m.id]: pos });
                    setOpen(null);
                  }}
                  onClose={() => setOpen(null)}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      <details className="text-xs text-pitch-400">
        <summary className="cursor-pointer font-semibold hover:text-accent">
          ⓘ How rewards work
        </summary>
        <p className="mt-1.5 max-w-2xl leading-relaxed">
          Mirrors Polymarket&apos;s program: order score S = ((v−s)/v)² — the
          closer your quote sits to the midpoint, the more you earn,
          quadratically. One-sided books earn ⅓. Daily epoch, paid pro-rata
          from each market&apos;s pool; earnings under $1/day aren&apos;t paid.
          Simulation — no real orders or funds.
        </p>
      </details>
    </div>
  );
}
