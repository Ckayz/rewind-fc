"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { STAGE_LABEL, type Stage } from "@/data/sample-fixtures";
import { flag } from "@/lib/flags";

export interface MarketFixture {
  fixtureId: string;
  p1: string;
  p2: string;
  startTime: string; // ISO
  stage: Stage;
  status: "finished" | "scheduled" | "live";
  score?: { p1: number; p2: number; note?: string };
  hasTimeline: boolean;
}

type Filter =
  | "all"
  | "live"
  | "1min"
  | "5min"
  | "10min"
  | "15min"
  | "upcoming"
  | "final"
  | "sf"
  | "qf"
  | "r16";

const FILTERS: { key: Filter; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "▦" },
  { key: "live", label: "Live", icon: "🔴" },
  { key: "1min", label: "1 Min", icon: "⏱" },
  { key: "5min", label: "5 Min", icon: "⚡" },
  { key: "10min", label: "10 Min", icon: "🕙" },
  { key: "15min", label: "15 Min", icon: "🕒" },
  { key: "upcoming", label: "Upcoming", icon: "🕑" },
  { key: "final", label: "Final", icon: "🏆" },
  { key: "sf", label: "Semifinals", icon: "🥈" },
  { key: "qf", label: "Quarterfinals", icon: "🎯" },
  { key: "r16", label: "Round of 16", icon: "16" },
];

function matches(f: MarketFixture, filter: Filter): boolean {
  switch (filter) {
    case "all": return true;
    case "live": return f.status === "live";
    case "5min": return f.hasTimeline || f.status !== "finished"; // 5-min forecast markets exist on replays + live
    case "1min":
    case "10min":
    case "15min":
      return false; // durations launching with venue integration
    case "upcoming": return f.status === "scheduled";
    default: return f.stage === filter;
  }
}

function Card({ f, i }: { f: MarketFixture; i: number }) {
  const finished = f.status === "finished";
  const href = finished && f.hasTimeline ? `/match/${f.fixtureId}/replay` : `/match/${f.fixtureId}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.4) }}
      className="glass flex flex-col rounded-xl p-4"
    >
      <div className="mb-1 flex items-center justify-between text-[11px] text-pitch-400">
        <span>{STAGE_LABEL[f.stage]}</span>
        {f.status === "live" ? (
          <span className="flex items-center gap-1 font-semibold text-live">
            <span className="h-1.5 w-1.5 rounded-full bg-live animate-live-pulse" />
            LIVE
          </span>
        ) : finished ? (
          <span className="font-semibold text-pitch-300">FT</span>
        ) : (
          <span>
            {new Date(f.startTime).toLocaleString("en-US", {
              month: "short", day: "numeric", hour: "2-digit",
              minute: "2-digit", timeZone: "UTC", hour12: false,
            })}{" "}
            UTC
          </span>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2 text-base font-semibold">
        <span className="truncate">
          {flag(f.p1)} {f.p1}
        </span>
        {finished && f.score ? (
          <span className="score-digits shrink-0 px-1 text-xl text-volt">
            {f.score.p1}–{f.score.p2}
          </span>
        ) : (
          <span className="shrink-0 text-xs text-pitch-400">vs</span>
        )}
        <span className="truncate text-right">
          {f.p2} {flag(f.p2)}
        </span>
      </div>
      {f.score?.note && (
        <p className="-mt-2 mb-2 text-[11px] text-pitch-400">{f.score.note}</p>
      )}

      <div className="mt-auto grid grid-cols-2 gap-1.5">
        <Link
          href={href}
          className={`rounded-lg py-2 text-center text-sm font-semibold transition-colors ${
            finished && f.hasTimeline
              ? "bg-success/10 text-success hover:bg-success/20"
              : "bg-accent/10 text-accent hover:bg-accent/20"
          }`}
        >
          {finished && f.hasTimeline ? "▶ Replay" : f.status === "live" ? "Watch live" : "Trade"}
        </Link>
        <Link
          href={`/match/${f.fixtureId}`}
          className="rounded-lg bg-pitch-800 py-2 text-center text-sm font-semibold text-pitch-100 transition-colors hover:bg-pitch-700"
        >
          Markets
        </Link>
      </div>
    </motion.div>
  );
}

export function MarketsBrowser({ fixtures }: { fixtures: MarketFixture[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const counts = useMemo(() => {
    const c = new Map<Filter, number>();
    for (const flt of FILTERS) c.set(flt.key, fixtures.filter((f) => matches(f, flt.key)).length);
    return c;
  }, [fixtures]);
  const shown = fixtures.filter((f) => matches(f, filter));

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/* sidebar (chips on mobile) */}
      <aside className="lg:w-52 lg:shrink-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible">
          {FILTERS.map((flt) => (
            <button
              key={flt.key}
              onClick={() => setFilter(flt.key)}
              className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:w-full ${
                filter === flt.key
                  ? "bg-accent/12 bg-accent/10 text-accent"
                  : "text-pitch-300 hover:bg-pitch-800 hover:text-pitch-50"
              }`}
            >
              <span className="w-5 text-center text-xs">{flt.icon}</span>
              {flt.label}
              <span className="ml-auto hidden text-xs text-pitch-500 lg:inline">
                {counts.get(flt.key)}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* card grid */}
      <div className="min-w-0 flex-1">
        {shown.length === 0 ? (
          <p className="glass rounded-xl py-12 text-center text-sm text-pitch-400">
            {["1min", "10min", "15min"].includes(filter)
              ? "This market duration launches with venue integration — 5 Min is live today."
              : "No markets in this view right now."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((f, i) => (
              <Card key={f.fixtureId} f={f} i={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
