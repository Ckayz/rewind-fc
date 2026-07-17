import { notFound } from "next/navigation";
import { ReplayPlayer } from "@/components/ReplayPlayer";
import { FadeRise } from "@/components/motion/FadeRise";
import { getFixture, getTimeline } from "@/lib/data";
import { flag } from "@/lib/flags";

export const metadata = { title: "Live Demo — Rewind FC" };
export const revalidate = 3600;

// England v Argentina semifinal — the model famously reads Argentina up
// before both late goals (87' and 91')
const DEMO_ID = "18241006";
const START_AT = 78 * 60_000; // join "live" at 78' with the match at 1-1

export default async function DemoPage() {
  const fixture = await getFixture(DEMO_ID);
  const timeline = await getTimeline(DEMO_ID);
  if (!fixture || !timeline) notFound();

  return (
    <div className="flex flex-col gap-5 pt-8 pb-10">
      <FadeRise>
        <div className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide">
          <span className="h-2 w-2 rounded-full bg-live animate-live-pulse" />
          <span className="text-live">Live</span>
          <span className="text-pitch-100">
            {flag(fixture.p1)} {fixture.p1} v {fixture.p2} {flag(fixture.p2)}
          </span>
          <span className="ml-auto text-xs font-semibold normal-case tracking-widest text-pitch-500">
            World Cup semifinal · in play
          </span>
        </div>
      </FadeRise>
      <ReplayPlayer
        timeline={timeline}
        demoLive
        startAtMs={START_AT}
        initialSpeed={30}
      />
      <details className="glass rounded-xl px-5 py-4 text-sm text-pitch-300">
        <summary className="cursor-pointer font-display text-base font-semibold uppercase tracking-widest text-pitch-400 hover:text-volt">
          For judges — what am I watching?
        </summary>
        <p className="mt-2 max-w-3xl">
          A finished World Cup match streaming through Rewind FC&apos;s live
          pipeline as a simulated broadcast — every possession state, shot and
          odds tick is real TxLINE data. You joined at the 78th minute with the
          score 1–1. Watch the <span className="text-volt">⚡ Next 5 Minutes</span>{" "}
          model: pressure builds and the goal probability climbs <em>before</em>{" "}
          the strikes at 87&apos; and 91&apos; — the &quot;✓ Called it&quot;
          chip fires when the model had it right. Fans use this exact signal to
          time wallet-signed picks (live picks score ×3). During real live
          matches the same page runs off TxLINE&apos;s real-time feed.
        </p>
      </details>
    </div>
  );
}
