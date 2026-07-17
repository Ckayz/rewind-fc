import { notFound } from "next/navigation";
import { getTimeline, listFixtures } from "@/lib/data";
import { DeskTabs } from "@/components/DeskTabs";

export const metadata = { title: "Liquidity Desk — Rewind FC" };
export const revalidate = 3600;

const DESK_ID = "18237038"; // France v Spain semifinal

export default async function DeskPage() {
  const timeline = await getTimeline(DESK_ID);
  const fixtures = (await listFixtures())
    .filter((f) => f.hasTimeline || f.stage === "final")
    .map((f) => ({
      fixtureId: f.fixtureId,
      p1: f.p1,
      p2: f.p2,
      stage: f.stage,
    }));
  if (!timeline) notFound();

  return (
    <div className="flex flex-col gap-5 pt-10 pb-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-bold">💧 Liquidity desk</h1>
        <span className="rounded-lg border border-gold/40 bg-gold/5 px-3 py-1.5 text-xs font-semibold text-gold">
          Concept simulation · no real orders or funds
        </span>
      </div>
      <p className="max-w-2xl text-sm text-pitch-300">
        Earn by quoting our forecast-priced markets — rewards mirror
        Polymarket&apos;s program, settlement on TxLINE proofs.
      </p>
      <DeskTabs timeline={timeline} fixtures={fixtures} />
    </div>
  );
}
