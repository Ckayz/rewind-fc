import type { LineupSide, PlayerStatLine } from "@/db/schema";
import { flag } from "@/lib/flags";

function Side({ side, country }: { side: LineupSide; country: string }) {
  const starters = side.players.filter((p) => p.starter);
  const bench = side.players.filter((p) => !p.starter);
  return (
    <div>
      <h4 className="mb-2 font-display text-base font-semibold uppercase tracking-wide">
        {flag(country)} {country}
      </h4>
      <ul className="space-y-1 text-sm">
        {starters.map((p) => (
          <li key={p.id} className="flex items-baseline gap-2">
            <span className="score-digits w-6 shrink-0 text-right text-pitch-400">
              {p.num}
            </span>
            <span className="truncate text-pitch-50">{p.name}</span>
          </li>
        ))}
      </ul>
      {bench.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-pitch-400 hover:text-pitch-100">
            Bench ({bench.length})
          </summary>
          <ul className="mt-1 space-y-1 text-xs text-pitch-300">
            {bench.map((p) => (
              <li key={p.id} className="flex items-baseline gap-2">
                <span className="score-digits w-6 shrink-0 text-right text-pitch-500">
                  {p.num}
                </span>
                <span className="truncate">{p.name}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function LineupsPanel({
  lineups,
  p1,
  p2,
}: {
  lineups: { p1: LineupSide; p2: LineupSide };
  p1: string;
  p2: string;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <h3 className="mb-3 font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
        Starting lineups
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <Side side={lineups.p1} country={p1} />
        <Side side={lineups.p2} country={p2} />
      </div>
    </div>
  );
}

const STAT_LABEL: Record<string, string> = {
  goals: "⚽",
  ownGoals: "⚽ (og)",
  yellowCards: "🟨",
  redCards: "🟥",
  shots: "🎯",
  penaltyGoals: "⭕⚽",
  penaltyAttempts: "⭕",
};

export function PlayerStatsPanel({
  playerStats,
  p1,
  p2,
}: {
  playerStats: PlayerStatLine[];
  p1: string;
  p2: string;
}) {
  const notable = playerStats.filter((p) =>
    Object.values(p.stats).some((v) => v > 0)
  );
  if (notable.length === 0) return null;
  return (
    <div className="glass rounded-xl p-4">
      <h3 className="mb-3 font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
        Player stats — full time
      </h3>
      <ul className="space-y-1.5 text-sm">
        {notable.map((p) => (
          <li key={`${p.team}-${p.id}`} className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-xs text-pitch-400">
              {flag(p.team === "p1" ? p1 : p2)}
            </span>
            <span className="truncate text-pitch-50">{p.name}</span>
            <span className="ml-auto flex gap-2 text-xs">
              {Object.entries(p.stats)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => (
                  <span key={k} className="text-pitch-100">
                    {STAT_LABEL[k] ?? k} {v > 1 ? `×${v}` : ""}
                  </span>
                ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
