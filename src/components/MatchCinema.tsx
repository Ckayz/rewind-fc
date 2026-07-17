import { MATCH_VIDEOS, LIVE_LINKS } from "@/data/match-videos";

export function MatchCinema({
  fixtureId,
  p1,
  p2,
  finished,
  startTime,
}: {
  fixtureId: string;
  p1: string;
  p2: string;
  finished: boolean;
  startTime: Date;
}) {
  const videoId = MATCH_VIDEOS[fixtureId] ?? null;
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `FIFA World Cup 2026 ${p1} vs ${p2} highlights`
  )}`;

  return (
    <section className="glass rounded-xl p-4">
      <h3 className="mb-3 font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
        📺 Match cinema
      </h3>

      {finished && videoId ? (
        // FIFA disables third-party embedding — deep-link with official thumbnail
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noreferrer"
          className="group relative block overflow-hidden rounded-lg"
          style={{ aspectRatio: "16/9" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt={`${p1} v ${p2} — official highlights`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-pitch-950/40 transition-colors group-hover:bg-pitch-950/20">
            <span className="rounded-xl bg-volt px-6 py-3 font-display text-lg font-bold uppercase text-pitch-950">
              ▶ Watch official highlights ↗
            </span>
          </span>
          <span className="absolute bottom-2 right-3 text-[10px] font-semibold uppercase tracking-widest text-pitch-100/80">
            FIFA · YouTube
          </span>
        </a>
      ) : finished ? (
        <a
          href={searchUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg border border-pitch-700 py-6 font-display text-lg font-semibold uppercase tracking-wide text-pitch-100 transition-colors hover:border-volt hover:text-volt"
        >
          ▶ Watch highlights on YouTube ↗
        </a>
      ) : (
        <div>
          <p className="mb-3 text-sm text-pitch-300">
            Kickoff{" "}
            {startTime.toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "UTC",
              hour12: false,
            })}{" "}
            UTC — watch live with an official broadcaster:
          </p>
          <div className="flex flex-wrap gap-2">
            {LIVE_LINKS.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-pitch-700 px-3 py-2 text-sm font-semibold text-pitch-100 transition-colors hover:border-live hover:text-live"
              >
                🔴 {l.label} ↗
              </a>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-pitch-500">
            World Cup broadcast rights are territory-licensed — live video plays
            on official platforms; the Zone Radar above tracks the match live
            right here.
          </p>
        </div>
      )}
    </section>
  );
}
