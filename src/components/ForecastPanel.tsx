"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Forecast } from "@/lib/forecast";
import { flag } from "@/lib/flags";

function Bar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-pitch-100">
          {label}
        </span>
        <span className="score-digits text-xl leading-none" style={{ color }}>
          {Math.round(pct * 100)}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-pitch-800">
        <motion.div
          animate={{ width: `${Math.round(pct * 100)}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 10px ${color}66` }}
        />
      </div>
    </div>
  );
}

export function ForecastPanel({
  forecast,
  p1,
  p2,
  live,
  called,
  minuteLabel,
  windowLabel,
  windowProgress,
  windowLeftMs,
  windowKey,
}: {
  forecast: Forecast | null;
  p1: string;
  p2: string;
  live?: boolean;
  called?: { team: string; pct: number } | null;
  minuteLabel?: string;
  windowLabel?: string; // e.g. "80'–85'"
  windowProgress?: number; // 0..1 through the current window
  windowLeftMs?: number; // match-time remaining in window
  windowKey?: number; // changes each window → pulse
}) {
  const leftLabel =
    windowLeftMs !== undefined
      ? `${Math.floor(windowLeftMs / 60_000)}:${String(
          Math.floor((windowLeftMs % 60_000) / 1000)
        ).padStart(2, "0")}`
      : null;

  return (
    <motion.div
      key={windowKey}
      initial={windowKey !== undefined ? { scale: 0.985, opacity: 0.7 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-xl p-4"
    >
      <h3 className="mb-1 flex items-center justify-between font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
        ⚡ Next 5 minutes
        {minuteLabel && (
          <span className="score-digits text-xl text-volt volt-glow">
            {minuteLabel}
          </span>
        )}
      </h3>
      <p className="mb-2 text-[10px] uppercase tracking-widest text-pitch-500">
        Who scores next? · momentum model on live TxLINE data
      </p>

      {/* prediction-window countdown — a full 5:00 that drains each window */}
      {windowProgress !== undefined && forecast && (
        <div className="mb-3 rounded-lg border border-pitch-700/50 bg-pitch-900/50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-pitch-400">
              window {windowLabel}
            </span>
            <span className="score-digits text-2xl leading-none text-volt volt-glow">
              {leftLabel}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-pitch-500">
              next call
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-pitch-800">
            <div
              className="h-full rounded-full bg-volt transition-[width] duration-300 ease-linear"
              style={{
                width: `${(1 - windowProgress) * 100}%`,
                boxShadow: "0 0 8px rgba(198,255,0,0.5)",
              }}
            />
          </div>
        </div>
      )}

      {!forecast ? (
        <p className="py-4 text-center text-xs text-pitch-400">
          Model warms up once the match is in play.
        </p>
      ) : (
        <div className="space-y-2.5">
          <Bar label={`${flag(p1)} ${p1}`} pct={forecast.p1Goal} color="#c6ff00" />
          <Bar label={`${flag(p2)} ${p2}`} pct={forecast.p2Goal} color="#E0703F" />
          <Bar label="No goal" pct={forecast.noGoal} color="#8A94A6" />
          <div className="flex gap-2 pt-1">
            <span className="rounded-full border border-pitch-700 px-2.5 py-1 text-[11px] text-pitch-100">
              🚩 corner {Math.round(forecast.anyCorner * 100)}%
            </span>
            <span className="rounded-full border border-pitch-700 px-2.5 py-1 text-[11px] text-pitch-100">
              🟨 card {Math.round(forecast.anyCard * 100)}%
            </span>
          </div>

          {/* momentum tug-of-war */}
          <div className="pt-1">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-pitch-800">
              <motion.div
                animate={{
                  left: `${50 + Math.min(0, forecast.momentum) * 50}%`,
                  width: `${Math.abs(forecast.momentum) * 50}%`,
                }}
                transition={{ type: "spring", stiffness: 50, damping: 16 }}
                className="absolute top-0 h-full"
                style={{
                  background: forecast.momentum >= 0 ? "#c6ff00" : "#E0703F",
                }}
              />
              <span className="absolute left-1/2 top-0 h-full w-px bg-pitch-600" />
            </div>
            <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-pitch-500">
              <span>{p2} momentum</span>
              <span>{p1} momentum</span>
            </div>
          </div>

          {live && (
            <p className="pt-1 text-[11px] text-volt">
              Momentum window open — live picks score ×3 on the leaderboard.
            </p>
          )}
        </div>
      )}

      <AnimatePresence>
        {called && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-lg border border-volt/50 bg-volt/10 px-3 py-2 text-xs font-semibold text-volt"
          >
            ✓ Called it — model had {called.team} at {Math.round(called.pct * 100)}%
            moments before the goal
          </motion.div>
        )}
      </AnimatePresence>

      <details className="mt-3">
        <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-widest text-pitch-500 hover:text-volt">
          ⓘ How this prediction works
        </summary>
        <p className="mt-1.5 text-[11px] leading-relaxed text-pitch-400">
          At each 5-minute boundary the model reads the previous 10 minutes of
          TxLINE data: time in each pitch zone (box ×3.5, final third ×2,
          attack ×1, own half ×0.3), shots on target and corners. Territory
          share scales a Poisson goal rate (base 0.14 per team per 5&apos;),
          each shot adds 25%, and P = 1 − e^(−λ). Fully transparent — for fun,
          not financial advice.
        </p>
      </details>
    </motion.div>
  );
}
