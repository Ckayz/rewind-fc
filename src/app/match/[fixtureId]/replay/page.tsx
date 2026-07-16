import Link from "next/link";
import { notFound } from "next/navigation";
import { ReplayPlayer } from "@/components/ReplayPlayer";
import { SAMPLE_FIXTURES, STAGE_LABEL } from "@/data/sample-fixtures";
import { SAMPLE_GOALS } from "@/lib/sample-goals";
import { buildSampleTimeline } from "@/lib/replay/timeline";

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  const { fixtureId } = await params;
  const fixture = SAMPLE_FIXTURES.find((f) => f.fixtureId === fixtureId);
  if (!fixture || fixture.status !== "finished") notFound();

  const timeline = buildSampleTimeline(
    fixture.fixtureId,
    fixture.p1,
    fixture.p2,
    SAMPLE_GOALS[fixture.fixtureId] ?? []
  );

  return (
    <div className="flex flex-col gap-5 pt-8">
      <div className="flex items-center justify-between text-sm text-pitch-300">
        <span className="font-semibold uppercase tracking-widest">
          <span className="text-volt">Time Machine</span> ·{" "}
          {STAGE_LABEL[fixture.stage]}
        </span>
        <Link
          href={`/match/${fixture.fixtureId}`}
          className="text-volt hover:underline"
        >
          ← Match summary
        </Link>
      </div>
      <ReplayPlayer timeline={timeline} />
    </div>
  );
}
