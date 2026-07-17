import { FixtureCard } from "@/components/FixtureCard";
import { StaggerGrid, StaggerItem } from "@/components/motion/FadeRise";
import { STAGE_LABEL, type Stage } from "@/data/sample-fixtures";
import { listFixtures } from "@/lib/data";

const STAGE_ORDER: Stage[] = ["final", "bronze", "sf", "qf", "r16", "r32", "group"];

export const metadata = { title: "Matches — Rewind FC" };
export const revalidate = 60;

export default async function MatchesPage() {
  const all = await listFixtures();
  return (
    <div className="flex flex-col gap-10 pt-10">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
        All matches
      </h1>
      {STAGE_ORDER.map((stage) => {
        const fixtures = all.filter((f) => f.stage === stage);
        if (fixtures.length === 0) return null;
        return (
          <section key={stage}>
            <h2 className="mb-3 font-display text-xl font-semibold uppercase tracking-widest text-pitch-300">
              {STAGE_LABEL[stage]}
            </h2>
            <StaggerGrid className="grid gap-3 sm:grid-cols-2">
              {fixtures.map((f) => (
                <StaggerItem key={f.fixtureId}>
                  <FixtureCard fixture={f} />
                </StaggerItem>
              ))}
            </StaggerGrid>
          </section>
        );
      })}
    </div>
  );
}
