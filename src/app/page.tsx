import Link from "next/link";
import { FixtureCard } from "@/components/FixtureCard";
import { SAMPLE_FIXTURES } from "@/data/sample-fixtures";

export default function Home() {
  const upcoming = SAMPLE_FIXTURES.filter((f) => f.status === "scheduled");
  const replays = SAMPLE_FIXTURES.filter((f) => f.status === "finished");

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="pitch-lines relative -mx-4 overflow-hidden px-4 pb-14 pt-16 text-center">
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
          Replay all 104 matches as if they were happening now — goals, VAR
          drama, and real odds swings tick by tick. Sign your predictions with
          your wallet. Every data point verifiable on Solana.
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

      {/* Upcoming (live window) */}
      <section>
        <h2 className="mb-4 font-display text-2xl font-bold uppercase tracking-wide text-pitch-100">
          Still to play
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {upcoming.map((f) => (
            <FixtureCard key={f.fixtureId} fixture={f} />
          ))}
        </div>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {replays.map((f) => (
            <FixtureCard key={f.fixtureId} fixture={f} />
          ))}
        </div>
      </section>
    </div>
  );
}
