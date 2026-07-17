"use client";

import { motion, useReducedMotion } from "motion/react";
import type { PlayerStatLine } from "@/db/schema";
import { flag } from "@/lib/flags";

const CHIP: Record<string, { icon: string; label: string; cls: string }> = {
  goals: { icon: "⚽", label: "goal", cls: "border-volt/50 text-volt" },
  ownGoals: { icon: "⚽", label: "own goal", cls: "border-live/50 text-live" },
  penaltyGoals: { icon: "⭕", label: "pen scored", cls: "border-volt/50 text-volt" },
  penaltyAttempts: { icon: "⭕", label: "pen attempt", cls: "border-pitch-400/50 text-pitch-300" },
  yellowCards: { icon: "🟨", label: "", cls: "border-gold/40 text-gold" },
  redCards: { icon: "🟥", label: "", cls: "border-live/50 text-live" },
  shots: { icon: "🎯", label: "on target", cls: "border-pitch-400/40 text-pitch-300" },
};
const ORDER = ["goals", "ownGoals", "penaltyGoals", "yellowCards", "redCards", "penaltyAttempts"];

function TeamColumn({
  country,
  lines,
}: {
  country: string;
  lines: PlayerStatLine[];
}) {
  const reduced = useReducedMotion();
  const rank = (p: PlayerStatLine) =>
    ORDER.findIndex((k) => (p.stats[k] ?? 0) > 0);
  const sorted = [...lines].sort((a, b) => {
    const ra = rank(a) === -1 ? 99 : rank(a);
    const rb = rank(b) === -1 ? 99 : rank(b);
    return ra - rb;
  });

  return (
    <div>
      <h4 className="mb-2 font-display text-base font-semibold uppercase tracking-wide">
        {flag(country)} {country}
      </h4>
      {sorted.length === 0 ? (
        <p className="text-xs text-pitch-400">No individual entries recorded.</p>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map((p, i) => (
            <motion.li
              key={p.id}
              initial={reduced ? false : { opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
              className="flex flex-wrap items-center gap-1.5 rounded-lg bg-pitch-800/50 px-2.5 py-1.5 text-sm"
            >
              <span className="truncate font-medium text-pitch-50">{p.name}</span>
              <span className="ml-auto flex flex-wrap items-center gap-1">
                {ORDER.filter((k) => (p.stats[k] ?? 0) > 0).map((k) => {
                  const chip = CHIP[k];
                  const v = p.stats[k];
                  return (
                    <span
                      key={k}
                      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] ${chip.cls}`}
                    >
                      {chip.icon}
                      {v > 1 ? ` ×${v}` : ""}
                      {chip.label && (
                        <span className="hidden sm:inline">{chip.label}</span>
                      )}
                    </span>
                  );
                })}
              </span>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MatchSheet({
  playerStats,
  p1,
  p2,
}: {
  playerStats: PlayerStatLine[];
  p1: string;
  p2: string;
}) {
  const notable = playerStats.filter((p) =>
    ORDER.some((k) => (p.stats[k] ?? 0) > 0)
  );
  if (notable.length === 0) return null;
  return (
    <div className="glass rounded-xl p-4">
      <h3 className="mb-3 font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
        Match sheet — full time
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <TeamColumn country={p1} lines={notable.filter((p) => p.team === "p1")} />
        <TeamColumn country={p2} lines={notable.filter((p) => p.team === "p2")} />
      </div>
    </div>
  );
}
