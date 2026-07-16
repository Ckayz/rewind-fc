import type { MatchEvent } from "@/lib/replay/timeline";

const ICON: Record<MatchEvent["type"], string> = {
  goal: "⚽",
  shot: "🎯",
  yellow: "🟨",
  red: "🟥",
  corner: "🚩",
  var: "📺",
  penalty: "⭕",
  substitution: "🔁",
  phase: "⏱",
  comment: "💬",
};

export function EventFeed({ events }: { events: MatchEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-pitch-400">
        No events yet — press play.
      </p>
    );
  }
  return (
    <ol className="divide-y divide-pitch-700/40">
      {events.map((e, i) => (
        <li
          key={`${e.offsetMs}-${e.type}-${i}`}
          className={`flex items-center gap-3 px-1 py-2.5 ${
            i === 0 ? "animate-tick" : ""
          }`}
        >
          <span className="score-digits w-10 shrink-0 text-right text-lg text-pitch-300">
            {e.minute}&apos;
          </span>
          <span className="text-lg leading-none">{ICON[e.type]}</span>
          <span
            className={`text-sm ${
              e.type === "goal"
                ? "font-semibold text-volt"
                : e.type === "phase"
                  ? "font-semibold uppercase tracking-widest text-pitch-300"
                  : "text-pitch-100"
            }`}
          >
            {e.text}
          </span>
        </li>
      ))}
    </ol>
  );
}
