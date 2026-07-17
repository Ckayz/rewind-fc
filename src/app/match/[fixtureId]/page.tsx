import Link from "next/link";
import { notFound } from "next/navigation";
import { Scoreboard } from "@/components/Scoreboard";
import { EventFeed } from "@/components/EventFeed";
import { OddsChart } from "@/components/OddsChart";
import { STAGE_LABEL } from "@/data/sample-fixtures";
import { getFixture, getTimeline } from "@/lib/data";
import { foldTimeline } from "@/lib/replay/timeline";
import { PredictionPanel } from "@/components/PredictionPanel";
import { VerifyButton } from "@/components/VerifyModal";
import { LivePanel } from "@/components/LivePanel";
import { PitchLineup } from "@/components/PitchLineup";
import { MatchSheet } from "@/components/MatchSheet";

export const revalidate = 300;

export default async function MatchPage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  const { fixtureId } = await params;
  const fixture = await getFixture(fixtureId);
  if (!fixture) notFound();

  const timeline = fixture.hasTimeline ? await getTimeline(fixtureId) : null;
  const folded = timeline
    ? foldTimeline(timeline, timeline.meta.durationMs)
    : null;
  const finished = fixture.status === "finished";

  return (
    <div className="flex flex-col gap-6 pt-8">
      <div className="flex items-center justify-between text-sm text-pitch-300">
        <span className="font-semibold uppercase tracking-widest">
          {STAGE_LABEL[fixture.stage]}
        </span>
        <Link href="/matches" className="text-volt hover:underline">
          ← All matches
        </Link>
      </div>

      {finished ? (
        <Scoreboard
          p1={fixture.p1}
          p2={fixture.p2}
          scoreP1={fixture.score?.p1 ?? folded?.score.p1 ?? 0}
          scoreP2={fixture.score?.p2 ?? folded?.score.p2 ?? 0}
          phase={fixture.score?.note ?? "Full-time"}
        />
      ) : (
        <LivePanel
          fixtureId={fixture.fixtureId}
          p1={fixture.p1}
          p2={fixture.p2}
          kickoffIso={fixture.startTime.toISOString()}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        {timeline && (
          <Link
            href={`/match/${fixture.fixtureId}/replay`}
            className="flex-1 rounded-xl bg-volt px-6 py-3.5 text-center font-display text-xl font-bold uppercase tracking-wide text-pitch-950 transition-transform hover:scale-[1.01]"
          >
            ▶ Replay this match in the Time Machine
          </Link>
        )}
        {fixture.hasTimeline && <VerifyButton fixtureId={fixture.fixtureId} />}
      </div>

      {!finished && (
        <PredictionPanel
          fixtureId={fixture.fixtureId}
          p1={fixture.p1}
          p2={fixture.p2}
          mode="live"
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {folded && folded.odds.length > 0 && (
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
            <EventFeed events={folded.events.filter((e) => e.type !== "comment")} />
          ) : (
            <p className="py-8 text-center text-sm text-pitch-400">
              {finished
                ? "Event history for this match is outside TxLINE's retention window."
                : "Match hasn't kicked off yet."}
            </p>
          )}
        </div>
      </div>

      {timeline?.meta.playerStats && (
        <MatchSheet
          playerStats={timeline.meta.playerStats}
          p1={fixture.p1}
          p2={fixture.p2}
        />
      )}
      {timeline?.meta.lineups && (
        <PitchLineup
          lineups={timeline.meta.lineups}
          p1={fixture.p1}
          p2={fixture.p2}
        />
      )}
    </div>
  );
}
