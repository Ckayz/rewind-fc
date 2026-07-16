import type { CompiledTimeline, TimelineItem } from "@/db/schema";
import type { OddsPoint } from "@/components/OddsChart";

export interface MatchEvent {
  offsetMs: number;
  minute: number;
  type:
    | "goal"
    | "shot"
    | "yellow"
    | "red"
    | "corner"
    | "var"
    | "penalty"
    | "substitution"
    | "phase"
    | "comment";
  team?: "p1" | "p2";
  text: string;
}

export interface FoldedState {
  score: { p1: number; p2: number };
  phase: string;
  events: MatchEvent[]; // events up to t, newest first
  odds: OddsPoint[];
  finished: boolean;
}

const msToMin = (ms: number) => Math.floor(ms / 60_000);

/**
 * Pure fold over a compiled timeline: state of the match at virtual time t.
 * Shared by the replay UI and (later) server-side settlement.
 */
export function foldTimeline(tl: CompiledTimeline, tMs: number): FoldedState {
  const score = { p1: 0, p2: 0 };
  let phase = "Pre-match";
  let finished = false;
  const events: MatchEvent[] = [];
  const odds: OddsPoint[] = [];

  for (const item of tl.items) {
    if (item.offsetMs > tMs) break;
    if (item.kind === "score") {
      const p = item.payload as unknown as MatchEvent & {
        scoreP1?: number;
        scoreP2?: number;
      };
      if (p.type === "goal") {
        if (p.team === "p1") score.p1 += 1;
        else if (p.team === "p2") score.p2 += 1;
      }
      events.push({
        offsetMs: item.offsetMs,
        minute: msToMin(item.offsetMs),
        type: p.type,
        team: p.team,
        text: p.text,
      });
    } else if (item.kind === "phase") {
      const p = item.payload as { label: string; finished?: boolean };
      phase = p.label;
      if (p.finished) finished = true;
      events.push({
        offsetMs: item.offsetMs,
        minute: msToMin(item.offsetMs),
        type: "phase",
        text: p.label,
      });
    } else if (item.kind === "odds") {
      const p = item.payload as { home?: number; draw?: number; away?: number };
      odds.push({ tMin: msToMin(item.offsetMs), ...p });
    }
  }

  // attach goal markers onto odds series
  for (const e of events) {
    if (e.type !== "goal") continue;
    const nearest = odds.filter((o) => o.tMin <= e.minute).at(-1);
    if (nearest) nearest.goal = e.text;
  }

  return { score, phase, events: events.reverse(), odds, finished };
}

/** Deterministic sample timeline until real TxLINE data replaces it. */
export function buildSampleTimeline(
  fixtureId: string,
  p1: string,
  p2: string,
  goals: { minute: number; team: "p1" | "p2"; scorer: string }[]
): CompiledTimeline {
  const items: TimelineItem[] = [];
  const min = (m: number) => m * 60_000;

  items.push({ offsetMs: 0, kind: "phase", payload: { label: "Kickoff" } });
  items.push({ offsetMs: min(45), kind: "phase", payload: { label: "Half-time" } });
  items.push({ offsetMs: min(46), kind: "phase", payload: { label: "Second half" } });
  items.push({
    offsetMs: min(93),
    kind: "phase",
    payload: { label: "Full-time", finished: true },
  });

  for (const g of goals) {
    items.push({
      offsetMs: min(g.minute),
      kind: "score",
      payload: {
        type: "goal",
        team: g.team,
        text: `GOAL — ${g.scorer} (${g.team === "p1" ? p1 : p2})`,
      },
    });
    // flavor events around goals
    items.push({
      offsetMs: min(g.minute - 4),
      kind: "score",
      payload: {
        type: "shot",
        team: g.team,
        text: `Shot on target — ${g.team === "p1" ? p1 : p2}`,
      },
    });
  }
  items.push({
    offsetMs: min(31),
    kind: "score",
    payload: { type: "yellow", team: "p2", text: `Yellow card — ${p2}` },
  });
  items.push({
    offsetMs: min(58),
    kind: "score",
    payload: { type: "corner", team: "p1", text: `Corner — ${p1}` },
  });
  items.push({
    offsetMs: min(74),
    kind: "score",
    payload: { type: "var", text: "VAR check — possible penalty" },
  });

  // odds walk: deterministic drift + goal jumps
  let home = 2.4;
  let draw = 3.2;
  let away = 3.1;
  for (let m = 0; m <= 92; m += 2) {
    const wobble = Math.sin(m * 1.7 + fixtureId.length) * 0.04;
    home += wobble;
    away -= wobble * 0.7;
    for (const g of goals) {
      if (Math.abs(g.minute - m) < 1) {
        if (g.team === "p1") {
          home = Math.max(1.05, home * 0.55);
          away = Math.min(29, away * 1.9);
          draw = Math.min(19, draw * 1.35);
        } else {
          away = Math.max(1.05, away * 0.55);
          home = Math.min(29, home * 1.9);
          draw = Math.min(19, draw * 1.35);
        }
      }
    }
    items.push({
      offsetMs: min(m),
      kind: "odds",
      payload: {
        home: Number(home.toFixed(2)),
        draw: Number(draw.toFixed(2)),
        away: Number(away.toFixed(2)),
      },
    });
  }

  items.sort((a, b) => a.offsetMs - b.offsetMs);
  return {
    meta: {
      fixtureId,
      p1,
      p2,
      kickoffTs: 0,
      durationMs: min(93),
    },
    items,
  };
}
