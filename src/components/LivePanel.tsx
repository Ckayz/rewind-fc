"use client";

import { useEffect, useState } from "react";
import { Scoreboard } from "@/components/Scoreboard";
import { PitchRadar } from "@/components/PitchRadar";
import { PitchLineup } from "@/components/PitchLineup";
import { TabPills } from "@/components/TabPills";
import { ForecastPanel } from "@/components/ForecastPanel";
import type { Forecast } from "@/lib/forecast";
import type { BallZone } from "@/lib/replay/timeline";
import type { LineupSide } from "@/db/schema";
import { flag } from "@/lib/flags";

interface LiveState {
  ok: boolean;
  score: { p1: number; p2: number };
  phase: string;
  statusId: number;
  clockSeconds: number | null;
  odds: { home?: number; draw?: number; away?: number } | null;
  events: { action?: string; seq?: number; minute: number | null }[];
  zone: BallZone | null;
  lineups: { p1: LineupSide; p2: LineupSide } | null;
  forecast: Forecast | null;
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
  bettingExtra,
}: {
  fixtureId: string;
  p1: string;
  p2: string;
  kickoffIso: string;
  /** rendered at the bottom of the betting rail (e.g. pick panels) */
  bettingExtra?: React.ReactNode;
}) {
  const [state, setState] = useState<LiveState | null>(null);
  const [view, setView] = useState<"match" | "lineups">("match");
  const [streaming, setStreaming] = useState(false);

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
    // polling fallback stays on; SSE push makes refreshes instant
    const id = setInterval(tick, 15_000);

    // TxLINE SSE pass-through: any pushed event triggers an immediate refresh
    const sources = ["scores", "odds"].map((feed) => {
      const es = new EventSource(`/api/stream/${feed}?fixtureId=${fixtureId}`);
      es.onopen = () => mounted && setStreaming(true);
      es.onmessage = () => void tick();
      es.onerror = () => mounted && setStreaming(false);
      return es;
    });

    return () => {
      mounted = false;
      clearInterval(id);
      sources.forEach((es) => es.close());
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
      {/* LEFT: match status & info · RIGHT: everything betting */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          {state?.lineups && (
            <TabPills
              tabs={[
                { key: "match", label: "Match", icon: "📡" },
                { key: "lineups", label: "Lineups", icon: "👥" },
              ]}
              active={view}
              onChange={setView}
            />
          )}
          {view === "lineups" && state?.lineups ? (
            <PitchLineup lineups={state.lineups} p1={p1} p2={p2} />
          ) : (
          <PitchRadar
            zone={state?.zone ?? null}
            lastEvent={null}
            p1={p1}
            p2={p2}
            tMs={state?.clockSeconds ? state.clockSeconds * 1000 : 0}
            live
            lineups={state?.lineups ?? undefined}
          />
          )}
          <div className="flex items-center justify-end gap-1.5 text-[10px] font-semibold uppercase tracking-widest">
            <span
              className={`h-1.5 w-1.5 rounded-full ${streaming ? "bg-verify animate-live-pulse" : "bg-pitch-600"}`}
            />
            <span className={streaming ? "text-verify" : "text-pitch-500"}>
              {streaming ? "TxLINE stream connected" : "polling every 15s"}
            </span>
          </div>
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

        {/* betting rail */}
        <div className="flex min-w-0 flex-col gap-4">
          <h3 className="-mb-1 font-display text-sm font-semibold uppercase tracking-[0.25em] text-pitch-500">
            💸 Betting desk
          </h3>
          {state?.odds && (
            <div className="glass flex items-center justify-around rounded-xl px-4 py-3 text-center">
              {(
                [
                  [`${flag(p1)} ${p1}`, state.odds.home],
                  ["Draw", state.odds.draw],
                  [`${flag(p2)} ${p2}`, state.odds.away],
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
          <ForecastPanel
            forecast={state?.forecast ?? null}
            p1={p1}
            p2={p2}
            live
            minuteLabel={
              state?.clockSeconds != null
                ? `${Math.floor(state.clockSeconds / 60)}'`
                : undefined
            }
            windowKey={
              state?.clockSeconds != null
                ? Math.floor(state.clockSeconds / 300)
                : undefined
            }
            windowLabel={
              state?.clockSeconds != null
                ? `${Math.floor(state.clockSeconds / 300) * 5}'–${Math.floor(state.clockSeconds / 300) * 5 + 5}'`
                : undefined
            }
            windowProgress={
              state?.clockSeconds != null
                ? (state.clockSeconds % 300) / 300
                : undefined
            }
            windowLeftMs={
              state?.clockSeconds != null
                ? (300 - (state.clockSeconds % 300)) * 1000
                : undefined
            }
          />
          {bettingExtra}
        </div>
      </div>
    </div>
  );
}
