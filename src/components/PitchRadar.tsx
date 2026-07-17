"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useReducedMotion,
} from "motion/react";
import type { BallZone, MatchEvent } from "@/lib/replay/timeline";
import type { LineupSide } from "@/db/schema";
import { flag } from "@/lib/flags";

/* ---------- deterministic helpers (no Math.random — SSR/replay safe) ---------- */

const hash01 = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Zone → ball x-anchor (% of pitch length), p1 attacks left→right. */
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

const ROW_X = [7, 19, 33, 45]; // GK, DEF, MID, FWD anchors
const POS_ROW: Record<number, number> = { 34: 0, 35: 1, 36: 2, 37: 3 };
// how strongly each row tracks the ball vertically / joins attacks
const ROW_Y_TRACK = [0.12, 0.3, 0.5, 0.68];
const ROW_PUSH = [0, 4, 7, 9];

interface Vec {
  x: number;
  y: number;
}

interface SimPlayer extends Vec {
  id: number;
  num: string;
  name: string;
  team: "p1" | "p2";
  row: number;
  slotY: number; // formation y anchor
}

interface Sim {
  ball: Vec;
  ballTrail: Vec;
  ballTarget: Vec;
  nextPassAt: number;
  passSeed: number;
  players: SimPlayer[];
  targets: Map<number, Vec>;
  lastRetarget: number;
  zoneKey: string;
  eventKey: string;
}

function initPlayers(lineups: { p1: LineupSide; p2: LineupSide }): SimPlayer[] {
  const out: SimPlayer[] = [];
  for (const side of ["p1", "p2"] as const) {
    const starters = lineups[side].players.filter((p) => p.starter);
    const rows: (typeof starters)[] = [[], [], [], []];
    for (const p of starters) rows[POS_ROW[p.pos ?? 36] ?? 2].push(p);
    rows.forEach((row, ri) =>
      row.forEach((p, pi) => {
        const slotY = ((pi + 1) / (row.length + 1)) * 84 + 8;
        const x = side === "p1" ? ROW_X[ri] : 100 - ROW_X[ri];
        out.push({ id: p.id, num: p.num, name: p.name, team: side, row: ri, slotY, x, y: slotY });
      })
    );
  }
  return out;
}

function eventBallSpot(e: MatchEvent, zone: BallZone | null): Vec | null {
  const side = e.team === "p1" ? 1 : e.team === "p2" ? -1 : zone?.team === "p1" ? 1 : -1;
  const ax = (v: number) => (side === 1 ? v : 100 - v);
  switch (e.type) {
    case "goal": return { x: ax(97), y: 50 };
    case "shot": return { x: ax(84), y: 38 + hash01(e.offsetMs) * 24 };
    case "penalty": return { x: ax(89), y: 50 };
    case "corner": return { x: ax(99), y: hash01(e.offsetMs) > 0.5 ? 3 : 97 };
    default: return null;
  }
}

/** advance sim: passing-waypoint ball + role-based player targets */
function tick(sim: Sim, dt: number, wt: number, zone: BallZone | null, lastEvent: MatchEvent | null) {
  const zoneKey = zone ? `${zone.team}:${zone.z}` : "none";
  const eventKey = lastEvent ? `${lastEvent.offsetMs}:${lastEvent.type}` : "";

  // --- ball waypoints ---
  const retargetBall = () => {
    if (!zone) {
      sim.ballTarget = { x: 50, y: 50 };
      return;
    }
    sim.passSeed++;
    const bandX = zone.team === "p1" ? ZONE_X[zone.z] : 100 - ZONE_X[zone.z];
    const h1 = hash01(sim.passSeed * 7.13);
    const h2 = hash01(sim.passSeed * 3.77);
    sim.ballTarget = {
      x: Math.max(3, Math.min(97, bandX + (h1 - 0.5) * 16)),
      y: 14 + h2 * 72,
    };
    sim.nextPassAt = wt + 900 + hash01(sim.passSeed * 1.31) * 1700;
  };

  if (eventKey && eventKey !== sim.eventKey && lastEvent) {
    const spot = eventBallSpot(lastEvent, zone);
    sim.eventKey = eventKey;
    if (spot) {
      sim.ballTarget = spot;
      sim.nextPassAt = wt + 1400;
    }
  } else if (zoneKey !== sim.zoneKey) {
    sim.zoneKey = zoneKey;
    retargetBall(); // turnover / zone change = immediate long ball
  } else if (wt >= sim.nextPassAt) {
    retargetBall();
  }

  // ball moves fast toward target (pass), decelerating on arrival
  const bk = 1 - Math.exp(-dt * 4.2);
  sim.ball.x += (sim.ballTarget.x - sim.ball.x) * bk;
  sim.ball.y += (sim.ballTarget.y - sim.ball.y) * bk;
  const tk = 1 - Math.exp(-dt * 2.2);
  sim.ballTrail.x += (sim.ball.x - sim.ballTrail.x) * tk;
  sim.ballTrail.y += (sim.ball.y - sim.ballTrail.y) * tk;

  // --- player targets at ~2Hz ---
  if (wt - sim.lastRetarget > 480) {
    sim.lastRetarget = wt;
    const possessing = zone?.team;

    // nearest two teammates support, nearest opponent presses
    let support: number[] = [];
    let presser = -1;
    if (possessing) {
      const mates = sim.players
        .filter((p) => p.team === possessing && p.row > 0)
        .sort(
          (a, b) =>
            Math.hypot(a.x - sim.ball.x, a.y - sim.ball.y) -
            Math.hypot(b.x - sim.ball.x, b.y - sim.ball.y)
        );
      support = mates.slice(0, 2).map((p) => p.id);
      const opps = sim.players
        .filter((p) => p.team !== possessing && p.row > 0)
        .sort(
          (a, b) =>
            Math.hypot(a.x - sim.ball.x, a.y - sim.ball.y) -
            Math.hypot(b.x - sim.ball.x, b.y - sim.ball.y)
        );
      presser = opps[0]?.id ?? -1;
    }

    for (const p of sim.players) {
      const attackDir = p.team === "p1" ? 1 : -1;
      const hasBall = possessing === p.team;
      // line push / drop
      const push = (hasBall ? ROW_PUSH[p.row] : -ROW_PUSH[p.row] * 0.55) * attackDir;
      const baseX = (p.team === "p1" ? ROW_X[p.row] : 100 - ROW_X[p.row]) + push;
      // vertical ball tracking, discipline by row
      const y = p.slotY + (sim.ball.y - p.slotY) * ROW_Y_TRACK[p.row] * (hasBall ? 1 : 0.8);
      let target: Vec = { x: baseX, y };

      if (p.id === support[0]) {
        target = { x: sim.ball.x - 7 * attackDir, y: Math.min(92, sim.ball.y + 8) };
      } else if (p.id === support[1]) {
        target = { x: sim.ball.x - 4 * attackDir, y: Math.max(8, sim.ball.y - 10) };
      } else if (p.id === presser) {
        target = { x: sim.ball.x + 2.5 * attackDir, y: sim.ball.y + 2 };
      }
      // micro-jitter so nobody stands statue-still
      target.x += (hash01(p.id + Math.floor(wt / 1600)) - 0.5) * 2.4;
      target.y += (hash01(p.id * 3 + Math.floor(wt / 1400)) - 0.5) * 3.2;
      target.x = Math.max(2, Math.min(98, target.x));
      target.y = Math.max(4, Math.min(96, target.y));
      sim.targets.set(p.id, target);
    }
  }

  // integrate players toward targets (sprint-ish approach)
  const pk = 1 - Math.exp(-dt * 1.9);
  for (const p of sim.players) {
    const t = sim.targets.get(p.id);
    if (!t) continue;
    p.x += (t.x - p.x) * pk;
    p.y += (t.y - p.y) * pk;
  }
}

/* ---------- event ping overlay (unchanged visual language) ---------- */

function eventPing(e: MatchEvent | null, zone: BallZone | null) {
  if (!e) return null;
  const side = e.team === "p1" ? 1 : e.team === "p2" ? -1 : zone?.team === "p1" ? 1 : -1;
  const atkX = (v: number) => (side === 1 ? v : 100 - v);
  switch (e.type) {
    case "goal": return { x: atkX(97), y: 50, label: "GOAL!", big: true, color: "#c6ff00" };
    case "shot": return { x: atkX(86), y: 42, label: "SHOT", big: false, color: "#c6ff00" };
    case "penalty": return { x: atkX(89), y: 50, label: "PENALTY", big: true, color: "#ffc940" };
    case "corner": return { x: atkX(99), y: 4, label: "CORNER", big: false, color: "#4795d9" };
    case "yellow": return { x: 50, y: 20, label: "🟨", big: false, color: "#ffc940" };
    case "red": return { x: 50, y: 20, label: "🟥", big: false, color: "#ff3b30" };
    case "var": return { x: 50, y: 80, label: "VAR", big: false, color: "#e8f0e6" };
    default: return null;
  }
}

/* ---------- component ---------- */

export function PitchRadar({
  zone,
  lastEvent,
  p1,
  p2,
  tMs,
  live,
  lineups,
}: {
  zone: BallZone | null;
  lastEvent: MatchEvent | null;
  p1: string;
  p2: string;
  tMs: number;
  live?: boolean;
  lineups?: { p1: LineupSide; p2: LineupSide };
}) {
  const reduced = useReducedMotion();
  const simRef = useRef<Sim | null>(null);
  const [, force] = useState(0);
  const propsRef = useRef({ zone, lastEvent });
  propsRef.current = { zone, lastEvent };
  const wtRef = useRef(0);

  if (!simRef.current) {
    simRef.current = {
      ball: { x: 50, y: 50 },
      ballTrail: { x: 50, y: 50 },
      ballTarget: { x: 50, y: 50 },
      nextPassAt: 0,
      passSeed: 1,
      players: lineups ? initPlayers(lineups) : [],
      targets: new Map(),
      lastRetarget: 0,
      zoneKey: "init",
      eventKey: "",
    };
  }
  // late lineups (live announcements) — hydrate players once available
  if (lineups && simRef.current.players.length === 0) {
    simRef.current.players = initPlayers(lineups);
  }

  useAnimationFrame((_, delta) => {
    if (reduced) return;
    wtRef.current += delta;
    tick(
      simRef.current!,
      Math.min(delta, 64) / 1000,
      wtRef.current,
      propsRef.current.zone,
      propsRef.current.lastEvent
    );
    force((n) => (n + 1) % 1_000_000);
  });

  const sim = simRef.current;
  const ping = eventPing(lastEvent, zone);
  const possessing = zone ? (zone.team === "p1" ? p1 : p2) : null;
  void tMs;

  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-widest">
        <span className="flex items-center gap-2 text-pitch-300">
          <span
            className={`h-1.5 w-1.5 rounded-full ${live ? "bg-live animate-live-pulse" : "bg-volt"}`}
          />
          {live ? "Live" : "Replay"} · zone radar
          {lineups && (
            <a
              href="/lab"
              className="hidden text-pitch-500 underline-offset-2 hover:text-volt hover:underline sm:inline"
            >
              · simulated from zone data — real tracking in the Lab
            </a>
          )}
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
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #c6ff00 0 10%, transparent 10% 20%)",
          }}
        />
        <motion.div
          animate={{
            opacity: zone ? 0.1 : 0,
            left: zone?.team === "p1" ? "50%" : "0%",
          }}
          transition={{ duration: 0.8 }}
          className="absolute top-0 h-full w-1/2 bg-volt"
        />

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

        {/* players — engine-driven */}
        {sim.players.map((p) => (
          <div
            key={p.id}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className="group absolute z-[5] -translate-x-1/2 -translate-y-1/2"
            title={p.name}
          >
            <span
              className="score-digits flex h-5 w-5 items-center justify-center rounded-full border text-[9px] leading-none sm:h-6 sm:w-6 sm:text-[10px]"
              style={{
                borderColor: p.team === "p1" ? "#c6ff00" : "#E0703F",
                color: p.team === "p1" ? "#c6ff00" : "#E0703F",
                background: "rgba(10,15,11,0.75)",
              }}
            >
              {p.num}
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded bg-pitch-950/90 px-1 text-[9px] text-pitch-100 opacity-0 transition-opacity group-hover:opacity-100">
              {p.name}
            </span>
          </div>
        ))}

        <span className="absolute left-2 top-1.5 text-[10px] font-semibold uppercase tracking-widest text-pitch-400">
          {flag(p1)} {p1} →
        </span>
        <span className="absolute right-2 top-1.5 text-[10px] font-semibold uppercase tracking-widest text-pitch-400">
          ← {p2} {flag(p2)}
        </span>

        {/* ball trail + ball */}
        <div
          style={{ left: `${sim.ballTrail.x}%`, top: `${sim.ballTrail.y}%` }}
          className="absolute z-[9] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-volt/25"
        />
        <div
          style={{ left: `${sim.ball.x}%`, top: `${sim.ball.y}%` }}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
        >
          <span className="relative block h-3.5 w-3.5 rounded-full bg-volt shadow-[0_0_14px_rgba(198,255,0,0.9)]">
            <span className="absolute inset-0 animate-ping rounded-full bg-volt/50" />
          </span>
        </div>

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

        {!zone && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-widest text-pitch-400">
            {live ? "waiting for kickoff" : "press play"}
          </span>
        )}
      </div>
    </div>
  );
}
