"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { flag } from "@/lib/flags";

function FlipDigit({ value, win }: { value: number; win: boolean }) {
  const reduced = useReducedMotion();
  return (
    <span className="relative inline-block overflow-hidden align-baseline">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={reduced ? false : { y: "-100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? undefined : { y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className={`inline-block ${win ? "text-volt volt-glow" : ""}`}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Scoreboard({
  p1,
  p2,
  scoreP1,
  scoreP2,
  phase,
  clockLabel,
  live,
}: {
  p1: string;
  p2: string;
  scoreP1: number;
  scoreP2: number;
  phase: string;
  clockLabel?: string;
  live?: boolean;
}) {
  return (
    <div className="glass pitch-lines relative overflow-hidden rounded-2xl px-6 py-8 text-center">
      <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-pitch-300">
        {live && (
          <span className="h-1.5 w-1.5 rounded-full bg-live animate-live-pulse" />
        )}
        <span className={live ? "text-live" : ""}>{phase}</span>
        {clockLabel && (
          <span className="score-digits ml-2 text-base text-volt volt-glow">
            {clockLabel}
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
        <span className="truncate text-right font-display text-xl font-bold uppercase sm:text-4xl">
          <span className="mr-2 text-2xl sm:text-4xl">{flag(p1)}</span>
          {p1}
        </span>
        <span className="score-digits text-5xl leading-none sm:text-8xl">
          <FlipDigit value={scoreP1} win={scoreP1 > scoreP2} />
          <span className="px-2 text-pitch-600">–</span>
          <FlipDigit value={scoreP2} win={scoreP2 > scoreP1} />
        </span>
        <span className="truncate text-left font-display text-xl font-bold uppercase sm:text-4xl">
          {p2}
          <span className="ml-2 text-2xl sm:text-4xl">{flag(p2)}</span>
        </span>
      </div>
    </div>
  );
}
