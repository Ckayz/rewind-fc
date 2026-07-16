import { flag } from "@/lib/flags";

export function Scoreboard({
  p1,
  p2,
  scoreP1,
  scoreP2,
  phase,
  clockLabel,
  live,
}: {
  p1: string;
  p2: string;
  scoreP1: number;
  scoreP2: number;
  phase: string;
  clockLabel?: string;
  live?: boolean;
}) {
  return (
    <div className="glass pitch-lines relative overflow-hidden rounded-2xl px-6 py-8 text-center">
      <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-pitch-300">
        {live && (
          <span className="h-1.5 w-1.5 rounded-full bg-live animate-live-pulse" />
        )}
        <span className={live ? "text-live" : ""}>{phase}</span>
        {clockLabel && (
          <span className="score-digits ml-2 text-base text-volt volt-glow">
            {clockLabel}
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
        <span className="truncate text-right font-display text-xl font-bold uppercase sm:text-4xl">
          <span className="mr-2 text-2xl sm:text-4xl">{flag(p1)}</span>
          {p1}
        </span>
        <span className="score-digits text-5xl leading-none sm:text-8xl">
          <span className={scoreP1 > scoreP2 ? "text-volt volt-glow" : ""}>
            {scoreP1}
          </span>
          <span className="px-2 text-pitch-600">–</span>
          <span className={scoreP2 > scoreP1 ? "text-volt volt-glow" : ""}>
            {scoreP2}
          </span>
        </span>
        <span className="truncate text-left font-display text-xl font-bold uppercase sm:text-4xl">
          {p2}
          <span className="ml-2 text-2xl sm:text-4xl">{flag(p2)}</span>
        </span>
      </div>
    </div>
  );
}
