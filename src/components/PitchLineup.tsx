"use client";

import { motion, useReducedMotion } from "motion/react";
import type { LineupSide } from "@/db/schema";
import { flag } from "@/lib/flags";

/** positionId → pitch row (34 GK … 37 FWD), goal at the bottom */
const ROW: Record<number, number> = { 34: 0, 35: 1, 36: 2, 37: 3 };

function surname(name: string) {
  const parts = name.split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ").split(" ")[0] : name;
}

function Pitch({ side, country }: { side: LineupSide; country: string }) {
  const reduced = useReducedMotion();
  const starters = side.players.filter((p) => p.starter);
  const rows: (typeof starters)[] = [[], [], [], []];
  for (const p of starters) {
    const rowIdx = ROW[p.pos ?? 36] ?? 2;
    rows[rowIdx].push(p);
  }
  const bench = side.players.filter((p) => !p.starter);
  const formation = rows
    .slice(1)
    .map((r) => r.length)
    .filter((n) => n > 0)
    .join("-");

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="font-display text-base font-semibold uppercase tracking-wide">
          {flag(country)} {country}
        </h4>
        {formation && (
          <span className="score-digits text-sm text-volt">{formation}</span>
        )}
      </div>

      {/* half pitch, goal at bottom */}
      <div className="relative aspect-[3/3.4] overflow-hidden rounded-xl border border-pitch-700/50 bg-gradient-to-b from-pitch-800 to-pitch-850">
        {/* markings */}
        <div className="absolute inset-x-0 top-0 h-px bg-pitch-600/50" />
        <div className="absolute left-1/2 top-0 h-16 w-40 -translate-x-1/2 rounded-b-full border border-t-0 border-pitch-600/40" />
        <div className="absolute bottom-0 left-1/2 h-14 w-44 -translate-x-1/2 border border-b-0 border-pitch-600/50" />
        <div className="absolute bottom-0 left-1/2 h-6 w-24 -translate-x-1/2 border border-b-0 border-pitch-600/60" />
        {/* mowing stripes */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #c6ff00 0 12%, transparent 12% 24%)",
          }}
        />

        <div className="absolute inset-0 flex flex-col-reverse justify-between px-2 py-3">
          {rows.map((row, ri) =>
            row.length === 0 ? (
              <div key={ri} />
            ) : (
              <div key={ri} className="flex items-center justify-around">
                {row.map((p, pi) => (
                  <motion.div
                    key={p.id}
                    initial={reduced ? false : { opacity: 0, scale: 0.4 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: 0.08 * ri + 0.05 * pi,
                      type: "spring",
                      stiffness: 260,
                      damping: 18,
                    }}
                    whileHover={reduced ? undefined : { scale: 1.12 }}
                    className="group flex w-14 flex-col items-center"
                    title={p.name}
                  >
                    <span
                      className={`score-digits flex h-9 w-9 items-center justify-center rounded-full border text-sm transition-colors ${
                        ri === 0
                          ? "border-gold/60 bg-gold/10 text-gold"
                          : "border-volt/50 bg-pitch-900/80 text-volt group-hover:bg-volt group-hover:text-pitch-950"
                      }`}
                    >
                      {p.num}
                    </span>
                    <span className="mt-1 w-full truncate text-center text-[10px] font-medium text-pitch-100">
                      {surname(p.name)}
                    </span>
                  </motion.div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {bench.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-pitch-400 hover:text-pitch-100">
            Bench ({bench.length})
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {bench.map((p) => (
              <span
                key={p.id}
                className="rounded-full border border-pitch-700/60 px-2 py-0.5 text-[11px] text-pitch-300"
              >
                <span className="score-digits text-pitch-400">{p.num}</span>{" "}
                {surname(p.name)}
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export function PitchLineup({
  lineups,
  p1,
  p2,
}: {
  lineups: { p1: LineupSide; p2: LineupSide };
  p1: string;
  p2: string;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <h3 className="mb-3 font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
        Starting lineups
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Pitch side={lineups.p1} country={p1} />
        <Pitch side={lineups.p2} country={p2} />
      </div>
    </div>
  );
}
