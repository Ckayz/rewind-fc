import Link from "next/link";
import { FixtureCard } from "@/components/FixtureCard";
import { HeroCanvas } from "@/components/HeroCanvas";
import { StaggerGrid, StaggerItem } from "@/components/motion/FadeRise";
import { listFixtures } from "@/lib/data";

export const revalidate = 60;

export default async function Home() {
  const all = await listFixtures();
  const upcoming = all.filter((f) => f.status !== "finished");
  const replays = all
    .filter((f) => f.status === "finished" && f.hasTimeline)
    .reverse();

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="pitch-lines relative -mx-5 sm:-mx-8 overflow-hidden px-5 sm:px-8 pb-14 pt-16 text-center">
        <HeroCanvas />
        <p
          className="animate-rise font-display text-lg font-semibold uppercase tracking-[0.3em] text-volt"
          style={{ animationDelay: "0ms" }}
        >
          World Cup 2026
        </p>
        <h1
          className="score-digits animate-rise mx-auto mt-3 max-w-3xl text-6xl uppercase leading-[0.9] sm:text-7xl"
          style={{ animationDelay: "90ms" }}
        >
          Every match.
          <br />
          <span className="text-volt volt-glow">Rewound live.</span>
        </h1>
        <p
          className="animate-rise mx-auto mt-5 max-w-xl text-pitch-300"
          style={{ animationDelay: "180ms" }}
        >
          Replay every match as if it were live — real odds, wallet-signed
          picks, verifiable on Solana.
        </p>
        <div
          className="animate-rise mt-8 flex items-center justify-center gap-3"
          style={{ animationDelay: "270ms" }}
        >
          <Link
            href={`/match/${replays[0]?.fixtureId ?? ""}`}
            className="rounded-lg bg-volt px-6 py-3 font-display text-lg font-bold uppercase tracking-wide text-pitch-950 transition-transform hover:scale-[1.03]"
          >
            ▶ Enter the Time Machine
          </Link>
          <Link
            href="/bracket"
            className="glass rounded-lg px-6 py-3 font-display text-lg font-semibold uppercase tracking-wide text-pitch-100 hover:border-volt/40"
          >
            Bracket
          </Link>
        </div>
      </section>

      {/* Final Showdown banner */}
      <Link
        href="/final"
        className="glass -mt-4 flex items-center justify-between rounded-xl border-gold/40 px-5 py-4 transition-colors hover:border-gold"
      >
        <span className="font-display text-xl font-bold uppercase tracking-wide text-gold">
          🏆 Final Showdown — exact score &amp; first scorer jackpots
        </span>
        <span className="font-display text-sm font-semibold uppercase text-pitch-300">
          Enter →
        </span>
      </Link>

      {/* Upcoming (live window) */}
      <section>
        <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-wide text-pitch-100">
          Still to play
        </h2>
        <StaggerGrid className="grid gap-3 sm:grid-cols-2">
          {upcoming.map((f) => (
            <StaggerItem key={f.fixtureId}>
              <FixtureCard fixture={f} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      </section>

      {/* Replay rail */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-pitch-100">
            Time Machine — featured replays
          </h2>
          <Link
            href="/matches"
            className="text-sm font-semibold uppercase tracking-widest text-volt hover:underline"
          >
            All matches →
          </Link>
        </div>
        <StaggerGrid className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {replays.map((f) => (
            <StaggerItem key={f.fixtureId}>
              <FixtureCard fixture={f} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      </section>
    </div>
  );
}
