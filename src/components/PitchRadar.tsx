"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { BallZone, MatchEvent } from "@/lib/replay/timeline";
import { flag } from "@/lib/flags";

/** Zone → ball x-position (% of pitch length), p1 attacks left→right. */
const ZONE_X: Record<BallZone["z"], number> = {
  safe: 32,
  attack: 56,
  danger: 73,
  box: 88,
};

const ZONE_COPY: Record<BallZone["z"], string> = {
  safe: "keeping the ball",
  attack: "building an attack",
  danger: "in the final third",
  box: "danger in the box!",
};

function ballPos(zone: BallZone | null, tMs: number): { x: number; y: number } {
  if (!zone) return { x: 50, y: 50 };
  const raw = ZONE_X[zone.z];
  const x = zone.team === "p1" ? raw : 100 - raw;
  // deterministic life: slow figure-eight wobble keyed on time
  const y = 50 + Math.sin(tMs / 2600) * 16 + Math.sin(tMs / 900) * 5;
  return { x, y };
}

function eventPing(e: MatchEvent | null, zone: BallZone | null) {
  if (!e) return null;
  const side = e.team === "p1" ? 1 : e.team === "p2" ? -1 : zone?.team === "p1" ? 1 : -1;
  const atkX = (v: number) => (side === 1 ? v : 100 - v);
  switch (e.type) {
    case "goal":
      return { x: atkX(97), y: 50, label: "GOAL!", big: true, color: "#c6ff00" };
    case "shot":
      return { x: atkX(86), y: 42, label: "SHOT", big: false, color: "#c6ff00" };
    case "penalty":
      return { x: atkX(89), y: 50, label: "PENALTY", big: true, color: "#ffc940" };
    case "corner":
      return { x: atkX(99), y: 4, label: "CORNER", big: false, color: "#4795d9" };
    case "yellow":
      return { x: 50, y: 20, label: "🟨", big: false, color: "#ffc940" };
    case "red":
      return { x: 50, y: 20, label: "🟥", big: false, color: "#ff3b30" };
    case "var":
      return { x: 50, y: 80, label: "VAR", big: false, color: "#e8f0e6" };
    default:
      return null;
  }
}

export function PitchRadar({
  zone,
  lastEvent,
  p1,
  p2,
  tMs,
  live,
}: {
  zone: BallZone | null;
  lastEvent: MatchEvent | null; // only pass events within the last few seconds
  p1: string;
  p2: string;
  tMs: number; // clock for wobble (virtual or wall)
  live?: boolean;
}) {
  const reduced = useReducedMotion();
  const pos = ballPos(zone, tMs);
  const ping = eventPing(lastEvent, zone);
  const possessing = zone ? (zone.team === "p1" ? p1 : p2) : null;

  return (
    <div className="glass overflow-hidden rounded-xl">
      {/* status strip */}
      <div className="flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-widest">
        <span className="flex items-center gap-2 text-pitch-300">
          <span
            className={`h-1.5 w-1.5 rounded-full ${live ? "bg-live animate-live-pulse" : "bg-volt"}`}
          />
          {live ? "Live" : "Replay"} · ball zone radar
        </span>
        <AnimatePresence mode="wait">
          {possessing && zone && (
            <motion.span
              key={`${zone.team}-${zone.z}`}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -6 }}
              className={zone.z === "box" ? "text-live" : zone.z === "danger" ? "text-volt" : "text-pitch-100"}
            >
              {flag(possessing)} {possessing} {ZONE_COPY[zone.z]}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="relative aspect-[105/58] w-full bg-gradient-to-b from-pitch-800 to-pitch-850">
        {/* mowing stripes */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #c6ff00 0 10%, transparent 10% 20%)",
          }}
        />
        {/* possession tint */}
        <motion.div
          animate={{
            opacity: zone ? 0.1 : 0,
            left: zone?.team === "p1" ? "50%" : "0%",
          }}
          transition={{ duration: 0.8 }}
          className="absolute top-0 h-full w-1/2 bg-volt"
        />

        {/* markings */}
        <svg viewBox="0 0 105 58" className="absolute inset-0 h-full w-full">
          <g stroke="#7a8a7c" strokeOpacity="0.35" strokeWidth="0.35" fill="none">
            <rect x="1" y="1" width="103" height="56" />
            <line x1="52.5" y1="1" x2="52.5" y2="57" />
            <circle cx="52.5" cy="29" r="7.2" />
            <rect x="1" y="14.5" width="13.5" height="29" />
            <rect x="90.5" y="14.5" width="13.5" height="29" />
            <rect x="1" y="21.5" width="4.5" height="15" />
            <rect x="99.5" y="21.5" width="4.5" height="15" />
            <path d="M 1 5 A 4 4 0 0 1 5 1" />
            <path d="M 100 1 A 4 4 0 0 1 104 5" />
            <path d="M 104 53 A 4 4 0 0 1 100 57" />
            <path d="M 5 57 A 4 4 0 0 1 1 53" />
          </g>
        </svg>

        {/* team labels */}
        <span className="absolute left-2 top-1.5 text-[10px] font-semibold uppercase tracking-widest text-pitch-400">
          {flag(p1)} {p1} →
        </span>
        <span className="absolute right-2 top-1.5 text-[10px] font-semibold uppercase tracking-widest text-pitch-400">
          ← {p2} {flag(p2)}
        </span>

        {/* ball + trail */}
        <motion.div
          animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 38, damping: 16, mass: 1.1 }
          }
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
        >
          <span className="relative block h-3.5 w-3.5 rounded-full bg-volt shadow-[0_0_14px_rgba(198,255,0,0.9)]">
            <span className="absolute inset-0 animate-ping rounded-full bg-volt/50" />
          </span>
        </motion.div>
        <motion.div
          animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 20, damping: 14, mass: 1.4 }
          }
          className="absolute z-[9] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-volt/30"
        />

        {/* event ping */}
        <AnimatePresence>
          {ping && (
            <motion.div
              key={`${lastEvent?.offsetMs}-${lastEvent?.type}`}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: ping.big ? 2.2 : 1.6 }}
              transition={{ duration: 0.45 }}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ left: `${ping.x}%`, top: `${ping.y}%` }}
            >
              <span
                className="score-digits block rounded px-1.5 py-0.5 text-sm font-bold uppercase"
                style={{ color: ping.color, textShadow: `0 0 12px ${ping.color}` }}
              >
                {ping.label}
              </span>
              <motion.span
                initial={{ scale: 0.3, opacity: 0.8 }}
                animate={{ scale: ping.big ? 3.4 : 2.2, opacity: 0 }}
                transition={{ duration: 1.1 }}
                className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                style={{ borderColor: ping.color }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* idle state */}
        {!zone && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-widest text-pitch-400">
            {live ? "waiting for kickoff" : "press play"}
          </span>
        )}
      </div>
    </div>
  );
}
