"use client";

import { useCallback, useState } from "react";

interface VerifyResult {
  ok: boolean;
  error?: string;
  seq?: number;
  epochDay?: number;
  rootsPda?: string;
  rootsAccountExists?: boolean;
  eventStatRoot?: number[] | null;
  statsToProve?: unknown[] | null;
  explorer?: { pda: string; program: string };
}

const STEPS = [
  "Fetching Merkle proof from TxLINE",
  "Deriving daily roots PDA from proof timestamp",
  "Reading root account on Solana mainnet",
];

export function VerifyButton({ fixtureId }: { fixtureId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const run = useCallback(async () => {
    setOpen(true);
    setResult(null);
    for (let i = 0; i < STEPS.length; i++) {
      setStep(i);
      await new Promise((r) => setTimeout(r, 550));
    }
    try {
      const res = await fetch(`/api/verify/${fixtureId}`);
      setResult(await res.json());
    } catch (e) {
      setResult({ ok: false, error: String(e) });
    }
    setStep(STEPS.length);
  }, [fixtureId]);

  return (
    <>
      <button
        onClick={run}
        className="flex items-center gap-2 rounded-lg border border-verify/40 px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-verify transition-colors hover:bg-verify/10"
      >
        ⛓ Verify on Solana
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass w-full max-w-lg rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 font-display text-xl font-bold uppercase tracking-wide text-verify">
              On-chain verification
            </h3>

            <ol className="space-y-3">
              {STEPS.map((label, i) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                      step > i
                        ? "border-verify bg-verify/20 text-verify"
                        : step === i
                          ? "animate-pulse border-volt text-volt"
                          : "border-pitch-700 text-pitch-500"
                    }`}
                  >
                    {step > i ? "✓" : i + 1}
                  </span>
                  <span className={step >= i ? "text-pitch-50" : "text-pitch-400"}>
                    {label}
                  </span>
                </li>
              ))}
            </ol>

            {result && (
              <div className="mt-5 border-t border-pitch-700/40 pt-4 text-sm">
                {result.ok ? (
                  <>
                    <p className="font-semibold text-verify">
                      ✓ Data anchored on Solana — daily Merkle root found
                      on-chain
                    </p>
                    <dl className="mt-3 space-y-1 font-mono text-xs text-pitch-300">
                      <div>
                        <dt className="inline text-pitch-400">Roots PDA: </dt>
                        <dd className="inline break-all">{result.rootsPda}</dd>
                      </div>
                      <div>
                        <dt className="inline text-pitch-400">Epoch day: </dt>
                        <dd className="inline">{result.epochDay}</dd>
                      </div>
                      <div>
                        <dt className="inline text-pitch-400">Record seq: </dt>
                        <dd className="inline">{result.seq}</dd>
                      </div>
                      <div>
                        <dt className="inline text-pitch-400">
                          Root account:{" "}
                        </dt>
                        <dd className="inline">
                          {result.rootsAccountExists
                            ? "exists ✓"
                            : "not found ✗"}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex gap-3">
                      <a
                        href={result.explorer?.pda}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-verify px-3 py-1.5 font-display text-xs font-bold uppercase text-pitch-950"
                      >
                        View root on Solscan →
                      </a>
                      <a
                        href={result.explorer?.program}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-pitch-700 px-3 py-1.5 font-display text-xs font-semibold uppercase text-pitch-100"
                      >
                        TxLINE program →
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="text-live">✗ {result.error}</p>
                )}
              </div>
            )}

            <button
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-lg border border-pitch-700 py-2 font-display text-sm font-semibold uppercase text-pitch-300 hover:text-pitch-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
