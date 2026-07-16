"use client";

import { useCallback, useState } from "react";
import { flag } from "@/lib/flags";

interface FixtureOpt {
  fixtureId: string;
  p1: string;
  p2: string;
  stageLabel: string;
}

interface ProofResult {
  ok: boolean;
  error?: string;
  endpoint?: string;
  seq?: number;
  messageId?: number;
  provenFixture?: string;
  fellBack?: boolean;
  proofTimestamp?: number;
  epochDay?: number;
  rootsPda?: string;
  rootsAccountExists?: boolean;
  rootsAccountOwner?: string | null;
  sameHourFixtureUpdates?: number | null;
  statsProven?: { stat?: { key?: number; value?: number; period?: number } }[];
  explorer?: { pda: string; program: string };
}

const PANELS = [
  {
    kind: "score",
    title: "Score proof",
    icon: "⚽",
    blurb:
      "Merkle multiproof (stat-validation-v3): goals + corners for both teams, three tree levels up to the daily scores root.",
    pda: "daily_scores_roots",
  },
  {
    kind: "odds",
    title: "Odds proof",
    icon: "📈",
    blurb:
      "StablePrice message proven against the daily odds batch root (odds/validation).",
    pda: "daily_batch_roots",
  },
  {
    kind: "fixture",
    title: "Fixture proof",
    icon: "📋",
    blurb:
      "Fixture record proven against the ten-day fixtures root (fixtures/validation + same-hour update feed + batch proof).",
    pda: "ten_daily_fixtures_roots",
  },
] as const;

function Panel({
  kind,
  title,
  icon,
  blurb,
  pda,
  fixtureId,
}: (typeof PANELS)[number] & { fixtureId: string }) {
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [result, setResult] = useState<ProofResult | null>(null);

  const run = useCallback(async () => {
    setState("running");
    setResult(null);
    try {
      const url =
        kind === "fixture"
          ? `/api/proofs/fixture/${fixtureId}?batch=1`
          : `/api/proofs/${kind}/${fixtureId}`;
      const res = await fetch(url);
      setResult(await res.json());
    } catch (e) {
      setResult({ ok: false, error: String(e) });
    }
    setState("done");
  }, [kind, fixtureId]);

  return (
    <div className="glass flex flex-col rounded-xl p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h3 className="font-display text-lg font-bold uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-pitch-300">{blurb}</p>

      <button
        onClick={run}
        disabled={state === "running"}
        className="mb-3 rounded-lg border border-verify/40 px-4 py-2 font-display text-sm font-semibold uppercase text-verify hover:bg-verify/10 disabled:opacity-50"
      >
        {state === "running" ? "Proving…" : "Run proof"}
      </button>

      {state === "running" && (
        <div className="animate-pulse text-xs text-pitch-300">
          fetch proof → derive <code>{pda}</code> PDA → read Solana mainnet…
        </div>
      )}

      {result && (
        <div className="mt-auto space-y-2 border-t border-pitch-700/40 pt-3 text-xs">
          {result.ok ? (
            <>
              <p className="font-semibold text-verify">
                ✓ root found on-chain
                {result.fellBack &&
                  " (proven on an upcoming fixture — finished markets close)"}
              </p>
              <dl className="space-y-0.5 font-mono text-[11px] text-pitch-300">
                <div className="truncate">
                  <span className="text-pitch-400">endpoint </span>
                  {result.endpoint}
                </div>
                <div className="truncate">
                  <span className="text-pitch-400">PDA </span>
                  {result.rootsPda}
                </div>
                <div>
                  <span className="text-pitch-400">epoch day </span>
                  {result.epochDay}
                  {result.seq !== undefined && (
                    <>
                      <span className="text-pitch-400"> · seq </span>
                      {result.seq}
                    </>
                  )}
                  {result.messageId !== undefined && (
                    <>
                      <span className="text-pitch-400"> · msg </span>
                      {result.messageId}
                    </>
                  )}
                </div>
                {result.statsProven && (
                  <div>
                    <span className="text-pitch-400">stats proven </span>
                    {result.statsProven
                      .map((s) => `k${s.stat?.key}=${s.stat?.value}`)
                      .join(" ")}
                  </div>
                )}
                {result.sameHourFixtureUpdates !== null &&
                  result.sameHourFixtureUpdates !== undefined && (
                    <div>
                      <span className="text-pitch-400">
                        fixture updates that hour{" "}
                      </span>
                      {result.sameHourFixtureUpdates}
                    </div>
                  )}
              </dl>
              <a
                href={result.explorer?.pda}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded bg-verify px-2.5 py-1 font-display text-[11px] font-bold uppercase text-pitch-950"
              >
                Root on Solscan →
              </a>
            </>
          ) : (
            <p className="text-live">✗ {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function ProofLab({ fixtures }: { fixtures: FixtureOpt[] }) {
  const [fixtureId, setFixtureId] = useState(fixtures[0]?.fixtureId ?? "");

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-wrap items-center gap-3">
        <span className="font-display text-sm font-semibold uppercase tracking-widest text-pitch-300">
          Fixture
        </span>
        <select
          value={fixtureId}
          onChange={(e) => setFixtureId(e.target.value)}
          className="glass rounded-lg px-3 py-2 text-sm text-pitch-50 outline-none"
        >
          {fixtures.map((f) => (
            <option
              key={f.fixtureId}
              value={f.fixtureId}
              className="bg-pitch-900"
            >
              {flag(f.p1)} {f.p1} v {f.p2} {flag(f.p2)} — {f.stageLabel}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 lg:grid-cols-3">
        {PANELS.map((p) => (
          <Panel key={p.kind} {...p} fixtureId={fixtureId} />
        ))}
      </div>
    </div>
  );
}
