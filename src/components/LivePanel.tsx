"use client";

import { useEffect, useState } from "react";
import { Scoreboard } from "@/components/Scoreboard";

interface LiveState {
  ok: boolean;
  score: { p1: number; p2: number };
  phase: string;
  statusId: number;
  clockSeconds: number | null;
  odds: { home?: number; draw?: number; away?: number } | null;
  events: { action?: string; seq?: number; minute: number | null }[];
}

const ICON: Record<string, string> = {
  goal: "⚽", shot: "🎯", corner: "🚩", var: "📺", penalty: "⭕",
  substitution: "🔁", kickoff: "⏱", yellow_card: "🟨", red_card: "🟥",
};

export function LivePanel({
  fixtureId,
  p1,
  p2,
  kickoffIso,
}: {
  fixtureId: string;
  p1: string;
  p2: string;
  kickoffIso: string;
}) {
  const [state, setState] = useState<LiveState | null>(null);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/live/${fixtureId}`);
        const data = await res.json();
        if (mounted && data.ok) setState(data);
      } catch {
        /* keep last state */
      }
    };
    void tick();
    const id = setInterval(tick, 10_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [fixtureId]);

  const inPlay = state && state.statusId >= 2 && state.statusId < 5;
  const clock =
    state?.clockSeconds != null
      ? `${String(Math.floor(state.clockSeconds / 60)).padStart(2, "0")}:${String(state.clockSeconds % 60).padStart(2, "0")}`
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Scoreboard
        p1={p1}
        p2={p2}
        scoreP1={state?.score.p1 ?? 0}
        scoreP2={state?.score.p2 ?? 0}
        phase={
          state?.phase ??
          `Kickoff ${new Date(kickoffIso).toLocaleString("en-US", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            timeZone: "UTC", hour12: false,
          })} UTC`
        }
        clockLabel={clock}
        live={!!inPlay}
      />
      {state?.odds && (
        <div className="glass flex items-center justify-around rounded-xl px-4 py-3 text-center">
          {(
            [
              [p1, state.odds.home],
              ["Draw", state.odds.draw],
              [p2, state.odds.away],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-pitch-400">
                {label}
              </div>
              <div className="score-digits text-2xl text-volt">
                {value?.toFixed(2) ?? "—"}
              </div>
            </div>
          ))}
          <span className="text-[10px] uppercase tracking-widest text-pitch-500">
            StablePrice · live
          </span>
        </div>
      )}
      {state && state.events.length > 0 && (
        <div className="glass rounded-xl p-4">
          <h3 className="mb-2 font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
            Latest events
          </h3>
          <ul className="space-y-1.5 text-sm">
            {state.events.map((e) => (
              <li key={e.seq} className="flex items-center gap-2">
                <span className="score-digits w-9 text-right text-pitch-300">
                  {e.minute != null ? `${e.minute}'` : ""}
                </span>
                <span>{ICON[e.action ?? ""] ?? "•"}</span>
                <span className="capitalize text-pitch-100">
                  {(e.action ?? "").replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
