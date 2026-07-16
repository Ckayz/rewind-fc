"use client";

import { useMemo } from "react";
import type { CompiledTimeline } from "@/db/schema";
import { foldTimeline } from "@/lib/replay/timeline";
import { useReplayClock } from "@/lib/replay/useReplayClock";
import { Scoreboard } from "@/components/Scoreboard";
import { EventFeed } from "@/components/EventFeed";
import { OddsChart } from "@/components/OddsChart";
import { PredictionPanel } from "@/components/PredictionPanel";

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

  return (
    <div className="flex flex-col gap-5">
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
