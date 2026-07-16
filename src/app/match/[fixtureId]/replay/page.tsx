import Link from "next/link";
import { notFound } from "next/navigation";
import { ReplayPlayer } from "@/components/ReplayPlayer";
import { STAGE_LABEL } from "@/data/sample-fixtures";
import { getFixture, getTimeline } from "@/lib/data";

export const revalidate = 3600; // finished timelines are immutable

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  const { fixtureId } = await params;
  const fixture = await getFixture(fixtureId);
  if (!fixture) notFound();
  const timeline = await getTimeline(fixtureId);
  if (!timeline) notFound();

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
