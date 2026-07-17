import type { TimelineItem } from "@/db/schema";

/**
 * "Next 5 minutes" momentum model — transparent heuristic, deliberately simple:
 * zone-pressure share + shot/corner rates over the trailing 10 in-play minutes
 * drive small Poisson intensities. Not a betting model; a fan-facing pulse.
 */

export interface ForecastInput {
  pressureP1: number; // weighted zone time, team 1
  pressureP2: number;
  shotsP1: number; // last 10 min
  shotsP2: number;
  corners: number;
  cards: number;
}

export interface Forecast {
  p1Goal: number; // P(goal by p1 in next 5 min) 0..1
  p2Goal: number;
  noGoal: number; // P(no goal at all in the window) = e^-(λ1+λ2)
  anyCorner: number;
  anyCard: number;
  momentum: number; // -1 (all p2) .. +1 (all p1)
}

const ZONE_W: Record<string, number> = { safe: 0.3, attack: 1, danger: 2, box: 3.5 };
const WINDOW_MS = 10 * 60_000;

export function computeForecast(i: ForecastInput): Forecast {
  const total = i.pressureP1 + i.pressureP2;
  const share1 = total > 0 ? i.pressureP1 / total : 0.5;
  const lam = (share: number, shots: number) =>
    Math.min(0.9, 0.14 * (0.4 + 1.6 * share) * (1 + 0.25 * shots));
  const lam1 = lam(share1, i.shotsP1);
  const lam2 = lam(1 - share1, i.shotsP2);
  const cornerLam = 0.5 + 0.1 * i.corners + 0.3 * Math.abs(share1 - 0.5) * 2;
  const cardLam = 0.22 + 0.09 * i.cards;
  return {
    p1Goal: 1 - Math.exp(-lam1),
    p2Goal: 1 - Math.exp(-lam2),
    noGoal: Math.exp(-(lam1 + lam2)),
    anyCorner: 1 - Math.exp(-cornerLam),
    anyCard: 1 - Math.exp(-cardLam),
    momentum: share1 * 2 - 1,
  };
}

/** Trailing-window stats from compiled timeline items (replay path). */
export function windowStats(items: TimelineItem[], tMs: number): ForecastInput {
  const from = tMs - WINDOW_MS;
  const input: ForecastInput = {
    pressureP1: 0,
    pressureP2: 0,
    shotsP1: 0,
    shotsP2: 0,
    corners: 0,
    cards: 0,
  };
  let prevZone: { at: number; team: "p1" | "p2"; z: string } | null = null;

  for (const item of items) {
    if (item.offsetMs > tMs) break;
    if (item.kind === "zone") {
      const p = item.payload as { team: "p1" | "p2"; z: string };
      if (prevZone && prevZone.at < tMs) {
        const start = Math.max(prevZone.at, from);
        const end = Math.min(item.offsetMs, tMs);
        if (end > start) {
          const w = (ZONE_W[prevZone.z] ?? 0.5) * (end - start);
          if (prevZone.team === "p1") input.pressureP1 += w;
          else input.pressureP2 += w;
        }
      }
      prevZone = { at: item.offsetMs, team: p.team, z: p.z };
    } else if (item.kind === "score" && item.offsetMs >= from) {
      const p = item.payload as { type?: string; team?: string };
      if (p.type === "shot") {
        if (p.team === "p2") input.shotsP2++;
        else input.shotsP1++;
      } else if (p.type === "corner") input.corners++;
      else if (p.type === "yellow" || p.type === "red") input.cards++;
    }
  }
  // close the open zone segment up to t
  if (prevZone) {
    const start = Math.max(prevZone.at, from);
    if (tMs > start) {
      const w = (ZONE_W[prevZone.z] ?? 0.5) * (tMs - start);
      if (prevZone.team === "p1") input.pressureP1 += w;
      else input.pressureP2 += w;
    }
  }
  return input;
}
