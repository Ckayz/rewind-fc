"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import type { LineupSide } from "@/db/schema";
import { flag } from "@/lib/flags";

interface Sel {
  scoreP1?: number;
  scoreP2?: number;
  playerId?: number;
  playerName?: string;
}

function useSignedPick(fixtureId: string) {
  const { publicKey, signMessage, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [mine, setMine] = useState<{ marketKey: string; selection: Sel }[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!connected) return;
    fetch(`/api/picks?fixtureId=${fixtureId}`)
      .then((r) => r.json())
      .then((d) => setMine(d.picks ?? []))
      .catch(() => {});
  }, [connected, fixtureId]);

  const place = useCallback(
    async (market: string, selection: Sel) => {
      if (!connected || !publicKey || !signMessage) {
        setVisible(true);
        return;
      }
      setBusy(true);
      setNote(null);
      try {
        const wallet = publicKey.toBase58();
        const message = `Rewind FC pick\nWallet: ${wallet}\nFixture: ${fixtureId}\nMarket: ${market}\nSelection: ${JSON.stringify(selection)}`;
        const sig = await signMessage(new TextEncoder().encode(message));
        const res = await fetch("/api/picks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fixtureId,
            mode: "live",
            market,
            selection,
            signature: Buffer.from(sig).toString("base64"),
          }),
        });
        const data = await res.json();
        if (!res.ok) setNote(data.error ?? "failed");
        else {
          setMine((m) => [...m, data.pick]);
          setNote("Locked in ✓ — signed with your wallet");
        }
      } finally {
        setBusy(false);
      }
    },
    [connected, publicKey, signMessage, fixtureId, setVisible]
  );

  return { mine, note, busy, place, connected };
}

export function ShowdownPicks({
  fixtureId,
  p1,
  p2,
  lineups,
}: {
  fixtureId: string;
  p1: string;
  p2: string;
  lineups: { p1: LineupSide; p2: LineupSide } | null;
}) {
  const { mine, note, busy, place, connected } = useSignedPick(fixtureId);
  const has = (mk: string) => mine.some((p) => p.marketKey === mk);
  const [score, setScore] = useState<[number, number]>([1, 1]);

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="mb-1 font-display text-xl font-bold uppercase tracking-widest text-gold">
        🏆 Showdown jackpots
      </h3>
      <p className="mb-4 text-xs text-pitch-400">
        One shot each, locked at kickoff, wallet-signed.
      </p>

      {/* exact score — 500 pts */}
      {!has("exact_score") ? (
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-pitch-300">
            Exact score — <span className="text-gold">500 pts</span>
          </p>
          <div className="flex items-center gap-3">
            {([0, 1] as const).map((side) => (
              <div key={side} className="flex items-center gap-2">
                <span className="text-lg">{flag(side === 0 ? p1 : p2)}</span>
                <div className="flex flex-col gap-0.5">
                  {[0, 1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() =>
                        setScore((s) => (side === 0 ? [n, s[1]] : [s[0], n]))
                      }
                      className={`score-digits h-7 w-9 rounded border text-sm ${
                        score[side] === n
                          ? "border-gold bg-gold/20 text-gold"
                          : "border-pitch-700 text-pitch-300 hover:border-gold/50"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              disabled={busy}
              onClick={() =>
                place("exact_score", { scoreP1: score[0], scoreP2: score[1] })
              }
              className="ml-2 rounded-lg bg-gold px-4 py-3 font-display text-base font-bold uppercase text-pitch-950 hover:scale-105 disabled:opacity-50"
            >
              Lock {score[0]}–{score[1]}
            </button>
          </div>
        </div>
      ) : (
        <p className="mb-4 text-sm text-gold">✓ Exact score locked</p>
      )}

      {/* first scorer — 300 pts */}
      {!has("first_scorer") ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-pitch-300">
            First goalscorer — <span className="text-gold">300 pts</span>
          </p>
          {lineups ? (
            <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
              {(["p1", "p2"] as const).flatMap((side) =>
                lineups[side].players
                  .filter((pl) => pl.starter)
                  .map((pl) => (
                    <button
                      key={pl.id}
                      disabled={busy}
                      onClick={() =>
                        place("first_scorer", {
                          playerId: pl.id,
                          playerName: pl.name,
                        })
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-pitch-700 px-2 py-1.5 text-left text-xs text-pitch-100 hover:border-gold hover:text-gold disabled:opacity-50"
                    >
                      <span>{flag(side === "p1" ? p1 : p2)}</span>
                      <span className="score-digits text-pitch-400">{pl.num}</span>
                      <span className="truncate">{pl.name}</span>
                    </button>
                  ))
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-pitch-700/50 px-3 py-4 text-center text-xs text-pitch-400">
              Squads drop ~1 hour before kickoff — first-scorer market opens
              then.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gold">✓ First scorer locked</p>
      )}

      {note && <p className="mt-3 text-xs text-volt">{note}</p>}
      {!connected && (
        <p className="mt-3 text-xs text-pitch-400">
          Connect wallet to enter — gasless signature, tamper-evident entry.
        </p>
      )}
    </div>
  );
}
