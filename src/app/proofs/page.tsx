import { ProofLab } from "@/components/ProofLab";
import { listFixtures } from "@/lib/data";
import { STAGE_LABEL } from "@/data/sample-fixtures";

export const metadata = { title: "Proof Room — Rewind FC" };
export const revalidate = 300;

export default async function ProofsPage() {
  const fixtures = (await listFixtures())
    .filter((f) => f.hasTimeline || f.status !== "finished")
    .reverse()
    .map((f) => ({
      fixtureId: f.fixtureId,
      p1: f.p1,
      p2: f.p2,
      stageLabel: STAGE_LABEL[f.stage],
    }));

  return (
    <div className="flex flex-col gap-6 pt-10 pb-10">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
          Proof room
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-pitch-300">
          Pick a match, run the proofs — score, odds and fixture data each
          verify against their own Merkle root on Solana.
        </p>
      </div>
      <ProofLab fixtures={fixtures} />
    </div>
  );
}
