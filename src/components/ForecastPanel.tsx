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
    <div className="flex items-center gap-2">
      <span className="w-28 truncate text-xs font-semibold uppercase tracking-wide text-pitch-100">
        {label}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-pitch-800">
        <motion.div
          animate={{ width: `${Math.round(pct * 100)}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 10px ${color}66` }}
        />
      </div>
      <span className="score-digits w-11 text-right text-lg" style={{ color }}>
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

export function ForecastPanel({
  forecast,
  p1,
  p2,
  live,
  called,
}: {
  forecast: Forecast | null;
  p1: string;
  p2: string;
  live?: boolean;
  called?: { team: string; pct: number } | null;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <h3 className="mb-3 flex items-center justify-between font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
        ⚡ Next 5 minutes
        <span className="text-[10px] normal-case tracking-normal text-pitch-500">
          momentum model · TxLINE data
        </span>
      </h3>

      {!forecast ? (
        <p className="py-4 text-center text-xs text-pitch-400">
          Model warms up once the match is in play.
        </p>
      ) : (
        <div className="space-y-2.5">
          <Bar label={`${flag(p1)} ${p1} goal`} pct={forecast.p1Goal} color="#c6ff00" />
          <Bar label={`${flag(p2)} ${p2} goal`} pct={forecast.p2Goal} color="#E0703F" />
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

      <p className="mt-3 text-[10px] text-pitch-500">
        Transparent heuristic on zone pressure, shots and corners — for fun, not
        financial advice.
      </p>
    </div>
  );
}
