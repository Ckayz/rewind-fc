import Link from "next/link";
import { HeroCanvas } from "@/components/HeroCanvas";
import { MarketsBrowser, type MarketFixture } from "@/components/MarketsBrowser";
import { listFixtures } from "@/lib/data";

export const revalidate = 60;

export default async function Home() {
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
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="pitch-lines relative -mx-5 sm:-mx-8 overflow-hidden px-5 sm:px-8 pb-10 pt-12 text-center">
        <HeroCanvas />
        <p
          className="animate-rise font-display text-lg font-semibold uppercase tracking-[0.3em] text-volt"
          style={{ animationDelay: "0ms" }}
        >
          World Cup 2026
        </p>
        <h1
          className="score-digits animate-rise mx-auto mt-2 max-w-3xl text-5xl uppercase leading-[0.9] sm:text-6xl"
          style={{ animationDelay: "90ms" }}
        >
          Every match.{" "}
          <span className="text-volt volt-glow">Rewound live.</span>
        </h1>
        <p
          className="animate-rise mx-auto mt-3 max-w-xl text-sm text-pitch-300"
          style={{ animationDelay: "180ms" }}
        >
          Replay every match as if it were live — real odds, wallet-signed
          picks, verifiable on Solana.
        </p>
        <div
          className="animate-rise mt-6 flex items-center justify-center gap-3"
          style={{ animationDelay: "270ms" }}
        >
          <Link
            href="/demo"
            className="rounded-lg bg-volt px-6 py-3 font-display text-lg font-bold uppercase tracking-wide text-pitch-950 transition-transform hover:scale-[1.03]"
          >
            🔴 Watch the live demo
          </Link>
          <Link
            href="/desk"
            className="glass rounded-lg px-6 py-3 font-display text-lg font-semibold uppercase tracking-wide text-pitch-100 hover:border-accent/40"
          >
            💧 Rewards
          </Link>
        </div>
      </section>

      {/* Final Showdown banner */}
      <Link
        href="/final"
        className="glass -mt-2 flex items-center justify-between rounded-xl border-gold/40 px-5 py-3.5 transition-colors hover:border-gold"
      >
        <span className="font-display text-lg font-bold text-gold">
          🏆 Final Showdown — exact score &amp; first scorer jackpots
        </span>
        <span className="text-sm font-semibold text-pitch-300">Enter →</span>
      </Link>

      {/* Polymarket-style market browser */}
      <MarketsBrowser fixtures={fixtures} />
    </div>
  );
}
