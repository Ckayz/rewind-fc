import { FixtureCard } from "@/components/FixtureCard";
import { SAMPLE_FIXTURES, STAGE_LABEL, type Stage } from "@/data/sample-fixtures";

const STAGE_ORDER: Stage[] = ["final", "bronze", "sf", "qf", "r16", "r32", "group"];

export const metadata = { title: "Matches — Rewind FC" };

export default function MatchesPage() {
  return (
    <div className="flex flex-col gap-10 pt-10">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
        All matches
      </h1>
      {STAGE_ORDER.map((stage) => {
        const fixtures = SAMPLE_FIXTURES.filter((f) => f.stage === stage);
        if (fixtures.length === 0) return null;
        return (
          <section key={stage}>
            <h2 className="mb-3 font-display text-xl font-semibold uppercase tracking-widest text-pitch-300">
              {STAGE_LABEL[stage]}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {fixtures.map((f) => (
                <FixtureCard key={f.fixtureId} fixture={f} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
