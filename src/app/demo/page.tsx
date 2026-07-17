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
        <div className="glass rounded-xl border-live/40 px-5 py-4">
          <div className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide">
            <span className="h-2 w-2 rounded-full bg-live animate-live-pulse" />
            <span className="text-live">Live demo</span>
            <span className="text-pitch-100">
              — {flag(fixture.p1)} {fixture.p1} v {fixture.p2} {flag(fixture.p2)},
              joined at the 78th minute
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-pitch-300">
            This is the World Cup semifinal streaming through Rewind FC&apos;s{" "}
            <strong>live pipeline</strong> — every possession state, shot and
            odds tick is real TxLINE data, replayed as if it were happening
            now. Watch the <span className="text-volt">⚡ Next 5 Minutes</span>{" "}
            model on the right: the score is 1–1, Argentina&apos;s pressure is
            building, and their goal probability climbs{" "}
            <em>before</em> they strike at 87&apos; and again at 91&apos; —
            the &quot;✓ Called it&quot; chip fires when the model had it right.
            Fans use exactly this signal to time their wallet-signed picks
            (live picks score ×3).
          </p>
        </div>
      </FadeRise>
      <ReplayPlayer
        timeline={timeline}
        demoLive
        startAtMs={START_AT}
        initialSpeed={30}
      />
    </div>
  );
}
