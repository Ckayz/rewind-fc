"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { CompiledTimeline } from "@/db/schema";
import { computeForecast, windowStats } from "@/lib/forecast";
import { buildBook, impliedFromOdds, type SubMarket } from "@/lib/mmdesk";
import { foldTimeline } from "@/lib/replay/timeline";
import { flag } from "@/lib/flags";

const WINDOW_MS = 5 * 60_000;
const SIDE_COLOR: Record<SubMarket["key"], string> = {
  P1: "#c6ff00",
  P2: "#E0703F",
  NONE: "#7a8a7c",
};

export function MMDesk({ timeline }: { timeline: CompiledTimeline }) {
  const { p1, p2, durationMs } = timeline.meta;
  const maxWindow = Math.max(1, Math.floor(durationMs / WINDOW_MS));
  const [windowIdx, setWindowIdx] = useState(Math.min(9, maxWindow)); // ~45'
  const [liquidity, setLiquidity] = useState(20_000);

  const boundary = windowIdx * WINDOW_MS;
  const forecast = useMemo(
    () => computeForecast(windowStats(timeline.items, boundary)),
    [timeline.items, boundary]
  );
  const parent = useMemo(() => {
    const odds = foldTimeline(timeline, boundary).odds.at(-1);
    return odds ? impliedFromOdds(odds) : null;
  }, [timeline, boundary]);
  const book = useMemo(
    () => buildBook(forecast, p1, p2, liquidity, 18),
    [forecast, p1, p2, liquidity]
  );

  return (
    <div className="flex flex-col gap-5">
      {/* parent + controls */}
      <div className="glass rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
              Parent market · match winner
            </h3>
            {parent ? (
              <div className="mt-1 flex gap-4 text-sm">
                <span>
                  {flag(p1)} {p1}{" "}
                  <span className="score-digits text-volt">
                    {Math.round(parent.p1 * 100)}%
                  </span>
                </span>
                <span className="text-pitch-400">
                  Draw{" "}
                  <span className="score-digits">
                    {Math.round(parent.draw * 100)}%
                  </span>
                </span>
                <span>
                  {flag(p2)} {p2}{" "}
                  <span className="score-digits text-[#E0703F]">
                    {Math.round(parent.p2 * 100)}%
                  </span>
                </span>
              </div>
            ) : (
              <p className="mt-1 text-xs text-pitch-400">
                implied from StablePrice odds
              </p>
            )}
          </div>
          <div className="score-digits text-2xl text-volt volt-glow">
            {windowIdx * 5}&apos;
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-pitch-400">
            Match minute
            <input
              type="range"
              min={2}
              max={maxWindow}
              value={windowIdx}
              onChange={(e) => setWindowIdx(Number(e.target.value))}
              className="w-40 accent-[#c6ff00]"
            />
          </label>
          <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-pitch-400">
            MM liquidity
            <input
              type="range"
              min={5_000}
              max={100_000}
              step={5_000}
              value={liquidity}
              onChange={(e) => setLiquidity(Number(e.target.value))}
              className="w-40 accent-[#c6ff00]"
            />
            <span className="score-digits text-base text-volt">
              ${(liquidity / 1000).toFixed(0)}k
            </span>
          </label>
        </div>
      </div>

      {/* sub-markets + wallet fan-out */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
            Builder sub-markets · {windowIdx * 5}&apos;–{windowIdx * 5 + 5}&apos;
          </h3>
          <span
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest ${
              book.selfCrossOk
                ? "border-verify/50 text-verify"
                : "border-live/50 text-live"
            }`}
          >
            {book.selfCrossOk ? "✓ no self-cross" : "⚠ self-cross"}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {book.subMarkets.map((m) => (
            <div key={m.key} className="glass rounded-xl p-4">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="font-display text-sm font-semibold uppercase tracking-wide">
                  {m.label}
                </span>
                <span
                  className="score-digits text-xl"
                  style={{ color: SIDE_COLOR[m.key] }}
                >
                  {Math.round(m.fairPct * 100)}%
                </span>
              </div>
              <p className="mb-2 text-[11px] text-pitch-400">
                {m.wallets.length} wallets · quote{" "}
                {m.wallets[0]?.bid.toFixed(2)} / {m.wallets[0]?.ask.toFixed(2)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {m.wallets.map((w) => (
                  <motion.span
                    key={w.id}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: w.id * 0.015 }}
                    className="rounded-md border px-1.5 py-0.5 text-[10px]"
                    style={{
                      borderColor: `${SIDE_COLOR[m.key]}55`,
                      color: SIDE_COLOR[m.key],
                    }}
                    title={`wallet #${w.id} · $${w.sizeUsd}`}
                  >
                    W{w.id} ${(w.sizeUsd / 1000).toFixed(1)}k
                  </motion.span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* net exposure -> parent hedge */}
      <div className="glass rounded-xl p-4">
        <h3 className="mb-3 font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
          Net book exposure → parent hedge
        </h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="w-24 text-right">
            {flag(p1)} ${(book.netDeltaP1 / 1000).toFixed(1)}k
          </span>
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-pitch-800">
            <div
              className="absolute left-0 top-0 h-full bg-volt/70"
              style={{
                width: `${(book.netDeltaP1 / (book.netDeltaP1 + book.netDeltaP2 || 1)) * 100}%`,
              }}
            />
            <div
              className="absolute right-0 top-0 h-full bg-[#E0703F]/70"
              style={{
                width: `${(book.netDeltaP2 / (book.netDeltaP1 + book.netDeltaP2 || 1)) * 100}%`,
              }}
            />
          </div>
          <span className="w-24">
            ${(book.netDeltaP2 / 1000).toFixed(1)}k {flag(p2)}
          </span>
        </div>
        <p className="mt-3 text-sm text-pitch-100">
          Residual{" "}
          <span className="score-digits text-volt">
            ${book.parentHedgeUsd.toLocaleString()}
          </span>{" "}
          hedged by going {book.parentHedgeSide} — the 18 sub-market quotes net
          back into one parent position. Total deployed $
          {book.totalDeployed.toLocaleString()}.
        </p>
      </div>

      <div className="glass rounded-xl border-verify/30 p-4 text-sm text-pitch-300">
        Each 5-minute sub-market settles on a{" "}
        <Link href="/proofs" className="text-verify hover:underline">
          TxLINE Merkle proof
        </Link>{" "}
        — the same verifiable data that prices it resolves it. Pricing engine =
        Rewind FC&apos;s momentum forecast; parent probabilities = StablePrice
        odds.
      </div>
    </div>
  );
}
