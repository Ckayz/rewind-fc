"use client";

import { useState } from "react";
import type { CompiledTimeline } from "@/db/schema";
import { RewardsDesk } from "@/components/RewardsDesk";
import { MMDesk } from "@/components/MMDesk";

export function DeskTabs({
  timeline,
  fixtures,
}: {
  timeline: CompiledTimeline;
  fixtures: { fixtureId: string; p1: string; p2: string; stage: string }[];
}) {
  const [tab, setTab] = useState<"rewards" | "router">("rewards");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 rounded-lg border border-pitch-700/60 p-1 self-start">
        {(
          [
            ["rewards", "Rewards"],
            ["router", "Router"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === key
                ? "bg-accent text-white"
                : "text-pitch-300 hover:text-pitch-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "rewards" ? (
        <RewardsDesk fixtures={fixtures} />
      ) : (
        <MMDesk timeline={timeline} />
      )}
    </div>
  );
}
