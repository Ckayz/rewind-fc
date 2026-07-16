import { QuoteCard } from "@/components/QuoteCard";

export const metadata = { title: "About — Rewind FC" };
export const revalidate = 3600;

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="glass rounded-xl p-6">
    <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-wide text-volt">
      {title}
    </h2>
    <div className="space-y-3 text-sm leading-relaxed text-pitch-100">
      {children}
    </div>
  </section>
);

export default function AboutPage() {
  return (
    <div className="flex flex-col gap-6 pt-10 pb-10">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
          About Rewind FC
        </h1>
        <p className="mt-2 max-w-2xl text-pitch-300">
          The World Cup ends — the matches shouldn&apos;t. Rewind FC turns
          TxLINE&apos;s Solana-anchored match data into a Time Machine: every
          knockout game replayable as if live, with real odds movement, signed
          predictions, and cryptographic receipts.
        </p>
      </div>

      <Section title="Why it matters">
        <p>
          Live-score apps are useless the day after the final. Rewind FC keeps
          the tournament alive: fans relive the drama minute by minute, watch
          how the betting market breathed around every goal, and compete on
          predictions — forever. The same engine powers genuinely live matches
          with sub-10-second updates from TxLINE&apos;s real-time tier.
        </p>
        <p>
          Every score and stat shown here is Merkle-anchored to Solana by
          TxODDS. The <span className="text-verify">⛓ Verify on Solana</span>{" "}
          button on any match fetches the proof and checks the daily root
          account on mainnet — trust the data because you can check the data.
        </p>
      </Section>

      <Section title="How it works">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Ingest:</strong> TxLINE fixtures + full score histories +
            5-minute odds windows are compiled into immutable replay timelines
            (Postgres, CDN-cached forever).
          </li>
          <li>
            <strong>Time Machine:</strong> a client-side virtual clock replays
            the timeline — goals, cards, VAR, penalties and StablePrice odds
            ticks fire with original match timing at ×30–×120 speed.
          </li>
          <li>
            <strong>Predictions:</strong> picks are signed with your Solana
            wallet (gasless <code>signMessage</code>) — the leaderboard is
            tamper-evident because every entry carries its signature.
          </li>
          <li>
            <strong>Live mode:</strong> for in-play matches the app polls a
            CDN-collapsed proxy of TxLINE&apos;s real-time feed (service level
            12).
          </li>
        </ul>
      </Section>

      <Section title="Business model">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Paid prediction pools:</strong> entry-fee pools in
            SOL/USDC per round with on-chain settlement against TxLINE proofs —
            take a small rake. The free leaderboard is the funnel.
          </li>
          <li>
            <strong>Premium Time Machine:</strong> free tier replays the
            knockout rounds; season pass unlocks full archives, multi-league
            coverage (TxLINE paid tiers), and odds-analytics overlays.
          </li>
          <li>
            <strong>B2B white-label:</strong> the replay engine as an embed for
            sportsbooks and fan sites — &quot;relive the match&quot; widgets
            with verifiable data are a differentiator they can&apos;t fake.
          </li>
          <li>
            <strong>Sponsorship:</strong> the odds chart and goal moments are
            premium, contextual ad inventory during replays.
          </li>
        </ul>
        <QuoteCard />
      </Section>

      <Section title="TxLINE API feedback (hackathon requirement)">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Loved:</strong> single normalized JSON schema;{" "}
            <code>/scores/historical</code> returning the complete match log
            with <code>Clock</code> made the replay engine possible;
            StablePrice consensus odds are clean and de-margined; guest JWT +
            on-chain activation flow is genuinely novel and worked on devnet
            and mainnet.
          </li>
          <li>
            <strong>Friction:</strong> the docs&apos; baked &quot;mainnet
            constants&quot; drifted from reality — the TxL mint on the mainnet
            program reference page differs from what community scripts assumed,
            and treasury PDAs (<code>token_treasury_v2</code> + its ATA) are
            undocumented; we had to derive them from the devnet examples.
            Activation returns the token as a bare JSON string (easy to
            double-encode). <code>fixtures/snapshot</code> only returns
            upcoming fixtures by default — <code>startEpochDay</code> is
            essential but easy to miss.
          </li>
          <li>
            <strong>Wishlist:</strong> a <code>/fixtures/results</code>{" "}
            endpoint with final scores (we reconstruct them from stat keys
            1/2); lineups; longer historical retention (group-stage histories
            had already expired mid-tournament); explicit rate-limit
            documentation; WebSocket alternative to SSE for browser-native
            streaming.
          </li>
        </ul>
      </Section>

      <Section title="TxLINE endpoint coverage — 19/19">
        <p>
          Rewind FC consumes <strong>every endpoint</strong> in the TxLINE API:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-pitch-700/40 uppercase tracking-widest text-pitch-400">
                <th className="py-2 pr-3">Endpoint</th>
                <th className="py-2">Powers</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11px]">
              {(
                [
                  ["auth/guest/start", "session bootstrap"],
                  ["token/activate", "on-chain subscription → API token"],
                  ["guest/purchase/quote", "live upgrade quote (above)"],
                  ["fixtures/snapshot (+startEpochDay)", "all 106 WC fixtures"],
                  ["fixtures/updates/{d}/{h}", "Proof Room fixture-hour feed"],
                  ["fixtures/validation", "Proof Room fixture proof"],
                  ["fixtures/batch-validation", "Proof Room whole-hour proof"],
                  ["odds/snapshot/{id}", "live market card"],
                  ["odds/updates/{id}", "live odds catch-up feed"],
                  ["odds/updates/{d}/{h}/{i}", "replay odds curves (ingest)"],
                  ["odds/stream", "live SSE pass-through"],
                  ["odds/validation", "Proof Room odds proof"],
                  ["scores/snapshot/{id}", "live score state"],
                  ["scores/updates/{id}", "live event catch-up feed"],
                  ["scores/updates/{d}/{h}/{i}", "Matchday Pulse"],
                  ["scores/historical/{id}", "Time Machine replays (ingest)"],
                  ["scores/stream", "live SSE pass-through"],
                  ["scores/stat-validation", "match-page verify button"],
                  ["scores/stat-validation-v3", "Proof Room multiproof"],
                ] as const
              ).map(([ep, use]) => (
                <tr key={ep} className="border-b border-pitch-700/20">
                  <td className="py-1.5 pr-3 text-verify">{ep}</td>
                  <td className="py-1.5 font-sans text-pitch-100">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Stack">
        <p>
          Next.js 16 · TypeScript · Tailwind v4 · Neon Postgres + Drizzle ·
          Solana wallet-adapter + tweetnacl · TxLINE REST (mainnet, service
          level 12) · Vercel. Data verification: TxLINE txoracle program{" "}
          <code className="break-all">
            9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA
          </code>
          .
        </p>
      </Section>
    </div>
  );
}
