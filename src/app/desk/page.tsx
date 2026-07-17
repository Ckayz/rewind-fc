import { notFound } from "next/navigation";
import { MMDesk } from "@/components/MMDesk";
import { getTimeline } from "@/lib/data";
import { flag } from "@/lib/flags";

export const metadata = { title: "Liquidity Desk — Rewind FC" };
export const revalidate = 3600;

const DESK_ID = "18237038"; // France v Spain semifinal

export default async function DeskPage() {
  const timeline = await getTimeline(DESK_ID);
  if (!timeline) notFound();

  return (
    <div className="flex flex-col gap-6 pt-10 pb-10">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
          💧 Liquidity desk
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-pitch-300">
          A market maker holds inventory in the {flag(timeline.meta.p1)}{" "}
          {timeline.meta.p1} v {timeline.meta.p2} {flag(timeline.meta.p2)}{" "}
          winner market. This desk shows how that liquidity is{" "}
          <span className="text-volt">priced by Rewind FC&apos;s forecast</span>,
          split into rolling 5-minute sub-markets, and{" "}
          <span className="text-volt">routed across 18 wallets</span> — netting
          the book back into a single parent hedge, every sub-market settled on
          a TxLINE proof. It&apos;s the commercial engine behind the fan game.
        </p>
        <p className="mt-2 inline-block rounded-lg border border-gold/40 bg-gold/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
          Concept simulation · no real orders, funds or venue calls
        </p>
      </div>
      <MMDesk timeline={timeline} />
    </div>
  );
}
