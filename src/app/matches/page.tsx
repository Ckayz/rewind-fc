import { MarketsBrowser, type MarketFixture } from "@/components/MarketsBrowser";
import { listFixtures } from "@/lib/data";

export const metadata = { title: "Markets — Rewind FC" };
export const revalidate = 60;

export default async function MatchesPage() {
  const all = await listFixtures();
  const fixtures: MarketFixture[] = all
    .slice()
    .reverse()
    .map((f) => ({
      fixtureId: f.fixtureId,
      p1: f.p1,
      p2: f.p2,
      startTime: f.startTime.toISOString(),
      stage: f.stage,
      status: f.status,
      score: f.score,
      hasTimeline: f.hasTimeline,
    }));

  return (
    <div className="flex flex-col gap-5 pt-8">
      <h1 className="font-display text-3xl font-bold">Markets</h1>
      <MarketsBrowser fixtures={fixtures} />
    </div>
  );
}
