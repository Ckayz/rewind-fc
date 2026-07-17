"use client";

import { useEffect, useState } from "react";
import { LivePanel } from "@/components/LivePanel";
import { PredictionPanel } from "@/components/PredictionPanel";
import { ShowdownPicks } from "@/components/ShowdownPicks";
import { ShareBar } from "@/components/ShareBar";
import { Confetti } from "@/components/Confetti";
import { FadeRise } from "@/components/motion/FadeRise";
import type { LineupSide } from "@/db/schema";
import { flag } from "@/lib/flags";

function Countdown({ kickoffIso }: { kickoffIso: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Date.parse(kickoffIso) - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [kickoffIso]);
  if (left === null) return null;
  if (left <= 0)
    return (
      <span className="score-digits text-4xl uppercase text-live">
        We are live
      </span>
    );
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return (
    <div className="score-digits flex items-baseline gap-3 text-6xl text-volt volt-glow sm:text-7xl">
      <span>{String(h).padStart(2, "0")}</span>
      <span className="text-pitch-600">:</span>
      <span>{String(m).padStart(2, "0")}</span>
      <span className="text-pitch-600">:</span>
      <span>{String(s).padStart(2, "0")}</span>
    </div>
  );
}

export function FinalShowdownClient({
  fixtureId,
  p1,
  p2,
  kickoffIso,
  finished,
  finalScore,
}: {
  fixtureId: string;
  p1: string;
  p2: string;
  kickoffIso: string;
  finished: boolean;
  finalScore: { p1: number; p2: number; note?: string } | null;
}) {
  const [lineups, setLineups] = useState<{ p1: LineupSide; p2: LineupSide } | null>(null);
  useEffect(() => {
    const load = () =>
      fetch(`/api/live/${fixtureId}`)
        .then((r) => r.json())
        .then((d) => d.lineups && setLineups(d.lineups))
        .catch(() => {});
    void load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [fixtureId]);

  return (
    <div className="flex flex-col gap-6 pt-10 pb-10">
      {finished && <Confetti pieces={60} />}
      <FadeRise>
        <div className="pitch-lines relative -mx-4 overflow-hidden px-4 py-10 text-center">
          <p className="font-display text-lg font-semibold uppercase tracking-[0.3em] text-gold">
            World Cup Final · MetLife Stadium
          </p>
          <h1 className="score-digits mt-2 text-5xl uppercase sm:text-6xl">
            {flag(p1)} {p1}
            <span className="px-3 text-pitch-600">v</span>
            {p2} {flag(p2)}
          </h1>
          <div className="mt-5 flex justify-center">
            {finished && finalScore ? (
              <span className="score-digits text-7xl text-volt volt-glow">
                {finalScore.p1}–{finalScore.p2}
              </span>
            ) : (
              <Countdown kickoffIso={kickoffIso} />
            )}
          </div>
          <div className="mt-5 flex justify-center">
            <ShareBar title={`${p1} v ${p2} — World Cup Final`} path="/final" />
          </div>
        </div>
      </FadeRise>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <LivePanel
          fixtureId={fixtureId}
          p1={p1}
          p2={p2}
          kickoffIso={kickoffIso}
        />
        <div className="flex flex-col gap-6">
          <ShowdownPicks
            fixtureId={fixtureId}
            p1={p1}
            p2={p2}
            lineups={lineups}
          />
          {!finished && (
            <PredictionPanel
              fixtureId={fixtureId}
              p1={p1}
              p2={p2}
              mode="live"
            />
          )}
        </div>
      </div>
    </div>
  );
}
