import { getFixture } from "@/lib/data";
import { FinalShowdownClient } from "@/components/FinalShowdown";

export const metadata = { title: "Final Showdown — Rewind FC" };
export const revalidate = 60;

const FINAL_ID = "18257739";

export default async function FinalPage() {
  const fixture = await getFixture(FINAL_ID);
  if (!fixture) {
    return (
      <p className="pt-20 text-center text-pitch-300">
        Final fixture not loaded yet — check back shortly.
      </p>
    );
  }
  return (
    <FinalShowdownClient
      fixtureId={FINAL_ID}
      p1={fixture.p1}
      p2={fixture.p2}
      kickoffIso={fixture.startTime.toISOString()}
      finished={fixture.status === "finished"}
      finalScore={fixture.score ?? null}
    />
  );
}
