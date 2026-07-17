"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { CompiledTimeline } from "@/db/schema";
import { foldTimeline } from "@/lib/replay/timeline";
import { useReplayClock } from "@/lib/replay/useReplayClock";
import { Scoreboard } from "@/components/Scoreboard";
import { EventFeed } from "@/components/EventFeed";
import { OddsChart } from "@/components/OddsChart";
import { PredictionPanel } from "@/components/PredictionPanel";
import { PitchLineup } from "@/components/PitchLineup";

const SPEEDS = [
  { label: "×30", value: 30 },
  { label: "×60", value: 60 },
  { label: "×120", value: 120 },
];

export function ReplayPlayer({ timeline }: { timeline: CompiledTimeline }) {
  const clock = useReplayClock(timeline.meta.durationMs, 60);
  const folded = useMemo(
    () => foldTimeline(timeline, clock.virtualMs),
    [timeline, clock.virtualMs]
  );

  const minute = Math.floor(clock.virtualMs / 60_000);
  const second = Math.floor((clock.virtualMs % 60_000) / 1000);

  // GOAL moment: flash + banner whenever the folded score total increases
  const reduced = useReducedMotion();
  const [goalFlash, setGoalFlash] = useState<string | null>(null);
  const prevGoals = useRef(0);
  const totalGoals = folded.score.p1 + folded.score.p2;
  useEffect(() => {
    if (totalGoals > prevGoals.current && clock.playing) {
      const latest = folded.events.find((e) => e.type === "goal");
      setGoalFlash(latest?.text ?? "GOAL");
      const t = setTimeout(() => setGoalFlash(null), 2200);
      prevGoals.current = totalGoals;
      return () => clearTimeout(t);
    }
    prevGoals.current = totalGoals;
  }, [totalGoals, clock.playing, folded.events]);

  return (
    <div className="relative flex flex-col gap-5">
      <AnimatePresence>
        {goalFlash && !reduced && (
          <motion.div
            key={goalFlash + String(totalGoals)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0.6 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.6 }}
              className="absolute inset-0 bg-volt/25"
            />
            <motion.div
              initial={{ scale: 0.6, rotate: -3, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 16 }}
              className="glass rounded-2xl border-volt/50 px-10 py-6 text-center"
            >
              <div className="score-digits text-6xl uppercase text-volt volt-glow">
                GOAL!
              </div>
              <div className="mt-1 font-display text-xl font-semibold uppercase text-pitch-50">
                {goalFlash.replace(/^GOAL — /, "")}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <Scoreboard
        p1={timeline.meta.p1}
        p2={timeline.meta.p2}
        scoreP1={folded.score.p1}
        scoreP2={folded.score.p2}
        phase={folded.phase}
        clockLabel={`${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`}
        live={clock.playing}
      />

      {/* Controls */}
      <div className="glass flex flex-wrap items-center gap-4 rounded-xl px-4 py-3">
        <button
          onClick={clock.toggle}
          className="rounded-lg bg-volt px-5 py-2 font-display text-lg font-bold uppercase text-pitch-950 transition-transform hover:scale-105"
        >
          {clock.playing ? "❚❚ Pause" : clock.done ? "↺ Restart" : "▶ Play"}
        </button>
        <div className="flex items-center gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              onClick={() => clock.setSpeed(s.value)}
              className={`rounded-md px-3 py-1.5 font-display text-sm font-semibold ${
                clock.speed === s.value
                  ? "bg-pitch-700 text-volt"
                  : "text-pitch-300 hover:text-pitch-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={timeline.meta.durationMs}
          value={clock.virtualMs}
          onChange={(e) => clock.seek(Number(e.target.value))}
          className="min-w-40 flex-1 accent-[#c6ff00]"
          aria-label="Seek match time"
        />
        <span className="score-digits w-12 text-right text-lg text-pitch-300">
          {minute}&apos;
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-5">
          {folded.odds.length > 0 && (
            <OddsChart
              data={folded.odds}
              homeName={timeline.meta.p1}
              awayName={timeline.meta.p2}
            />
          )}
          <PredictionPanel
            fixtureId={timeline.meta.fixtureId}
            p1={timeline.meta.p1}
            p2={timeline.meta.p2}
            mode="replay"
            virtualMs={clock.virtualMs}
          />
          {timeline.meta.lineups && (
            <PitchLineup
              lineups={timeline.meta.lineups}
              p1={timeline.meta.p1}
              p2={timeline.meta.p2}
            />
          )}
        </div>
        <div className="glass max-h-[32rem] overflow-y-auto rounded-xl p-4">
          <h3 className="mb-2 font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
            Live feed
          </h3>
          <EventFeed events={folded.events} />
        </div>
      </div>
    </div>
  );
}
