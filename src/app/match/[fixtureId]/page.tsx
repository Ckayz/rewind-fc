import Link from "next/link";
import { notFound } from "next/navigation";
import { Scoreboard } from "@/components/Scoreboard";
import { EventFeed } from "@/components/EventFeed";
import { OddsChart } from "@/components/OddsChart";
import { SAMPLE_FIXTURES, STAGE_LABEL } from "@/data/sample-fixtures";
import { SAMPLE_GOALS } from "@/lib/sample-goals";
import { buildSampleTimeline, foldTimeline } from "@/lib/replay/timeline";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  const { fixtureId } = await params;
  const fixture = SAMPLE_FIXTURES.find((f) => f.fixtureId === fixtureId);
  if (!fixture) notFound();

  const finished = fixture.status === "finished";
  const timeline = finished
    ? buildSampleTimeline(
        fixture.fixtureId,
        fixture.p1,
        fixture.p2,
        SAMPLE_GOALS[fixture.fixtureId] ?? []
      )
    : null;
  const folded = timeline
    ? foldTimeline(timeline, timeline.meta.durationMs)
    : null;

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div className="flex items-center justify-between text-sm text-pitch-300">
        <span className="font-semibold uppercase tracking-widest">
          {STAGE_LABEL[fixture.stage]}
          {fixture.venue ? ` · ${fixture.venue}` : ""}
        </span>
        <Link href="/matches" className="text-volt hover:underline">
          ← All matches
        </Link>
      </div>

      <Scoreboard
        p1={fixture.p1}
        p2={fixture.p2}
        scoreP1={folded?.score.p1 ?? 0}
        scoreP2={folded?.score.p2 ?? 0}
        phase={
          finished
            ? "Full-time"
            : `Kickoff ${new Date(fixture.startTime).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "UTC",
                hour12: false,
              })} UTC`
        }
      />

      {finished && (
        <Link
          href={`/match/${fixture.fixtureId}/replay`}
          className="rounded-xl bg-volt px-6 py-4 text-center font-display text-xl font-bold uppercase tracking-wide text-pitch-950 transition-transform hover:scale-[1.01]"
        >
          ▶ Replay this match in the Time Machine
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {folded && (
          <OddsChart
            data={folded.odds}
            homeName={fixture.p1}
            awayName={fixture.p2}
          />
        )}
        <div className="glass rounded-xl p-4">
          <h3 className="mb-2 font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
            Match events
          </h3>
          {folded ? (
            <EventFeed events={folded.events} />
          ) : (
            <p className="py-8 text-center text-sm text-pitch-400">
              Match hasn&apos;t kicked off yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
