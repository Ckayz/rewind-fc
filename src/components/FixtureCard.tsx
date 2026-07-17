"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { STAGE_LABEL, type Stage } from "@/data/sample-fixtures";
import { flag } from "@/lib/flags";

export interface CardFixture {
  fixtureId: string;
  p1: string;
  p2: string;
  score?: { p1: number; p2: number; note?: string };
  startTime: string | Date;
  stage: Stage;
  status: "finished" | "scheduled" | "live";
}

function kickoffLabel(iso: string | Date) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  });
}

export function FixtureCard({ fixture }: { fixture: CardFixture }) {
  const { p1, p2, score, status, stage } = fixture;
  const finished = status === "finished";
  const live = status === "live";
  const reduced = useReducedMotion();

  return (
    <motion.div
      whileHover={
        reduced
          ? undefined
          : { y: -4, boxShadow: "0 12px 32px -14px rgba(198,255,0,0.35)" }
      }
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="rounded-xl"
    >
    <Link
      href={`/match/${fixture.fixtureId}`}
      className="glass group relative block rounded-xl px-4 py-3 hover:border-volt/40"
    >
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-widest text-pitch-400">
        <span>{STAGE_LABEL[stage]}</span>
        {live ? (
          <span className="flex items-center gap-1.5 text-live">
            <span className="h-1.5 w-1.5 rounded-full bg-live animate-live-pulse" />
            Live
          </span>
        ) : (
          <span>{finished ? "FT" : `${kickoffLabel(fixture.startTime)} UTC`}</span>
        )}
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className="truncate font-display text-xl font-semibold uppercase">
          <span className="mr-1.5">{flag(p1)}</span>
          {p1}
        </span>
        <span className="score-digits text-3xl leading-none">
          {finished || live ? (
            <>
              <span className={score && score.p1 > score.p2 ? "text-volt" : ""}>
                {score?.p1 ?? 0}
              </span>
              <span className="px-1 text-pitch-400">–</span>
              <span className={score && score.p2 > score.p1 ? "text-volt" : ""}>
                {score?.p2 ?? 0}
              </span>
            </>
          ) : (
            <span className="text-pitch-400">VS</span>
          )}
        </span>
        <span className="truncate text-right font-display text-xl font-semibold uppercase">
          {p2}
          <span className="ml-1.5">{flag(p2)}</span>
        </span>
      </div>

      {score?.note && (
        <div className="mt-1 text-center text-[11px] text-pitch-300">
          {score.note}
        </div>
      )}

      {finished && (
        <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-volt opacity-0 transition-opacity group-hover:opacity-100">
          ▶ Replay in Time Machine
        </div>
      )}
    </Link>
    </motion.div>
  );
}
