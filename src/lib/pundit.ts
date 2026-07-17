import type { MatchEvent } from "@/lib/replay/timeline";

/** Deterministic template pundit — no LLM, always in voice. */

const pick = (seed: number, arr: string[]) => arr[seed % arr.length];

export function punditLine(
  e: MatchEvent,
  score: { p1: number; p2: number },
  p1: string,
  p2: string
): string | null {
  const seed = Math.floor(e.offsetMs / 1000);
  const team = e.team === "p1" ? p1 : e.team === "p2" ? p2 : "";
  const min = e.minute;
  switch (e.type) {
    case "goal":
      return pick(seed, [
        `The StablePrice line just snapped — ${team} strike in the ${min}' and the market is scrambling.`,
        `${min}' and bedlam. ${team} make it ${score.p1}–${score.p2} — check the odds chart fall off a cliff.`,
        `Cold-blooded from ${team}. The bookies saw it coming about four seconds too late.`,
        `That's why fans watch with a phone in hand — ${team} flip the whole match at ${min}'.`,
      ]);
    case "shot":
      return pick(seed, [
        `Gloves warmed at ${min}'. ${team} knocking.`,
        `${team} sniffing — the radar's been parked in the final third.`,
        `Half a yard more and that's a different scoreboard.`,
      ]);
    case "corner":
      return pick(seed, [
        `Corner ${min}' — set-piece merchants, look away now.`,
        `${team} piling on. Corner count climbing, momentum bar agrees.`,
      ]);
    case "red":
      return pick(seed, [
        `Down to ten! The forecast model just tore up its notes.`,
        `Red at ${min}' — everything you thought about this match is void.`,
      ]);
    case "yellow":
      return pick(seed, [
        `Booked at ${min}'. The card market twitches.`,
        `Referee's keeping receipts — ${team} on thin ice.`,
      ]);
    case "penalty":
      return pick(seed, [
        `Penalty! Breathe. The odds certainly aren't.`,
        `Spot kick at ${min}' — the biggest single swing the market knows.`,
      ]);
    case "var":
      return pick(seed, [
        `VAR huddle. Somewhere a trader is sweating through their jacket.`,
        `Lines frozen, breath held — VAR has entered the chat.`,
      ]);
    default:
      return null;
  }
}
