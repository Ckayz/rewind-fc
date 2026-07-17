"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { flag } from "@/lib/flags";

interface Selection {
  pick?: "P1" | "X" | "P2";
  stat?: "corners" | "goals";
  line?: number;
  side?: "over" | "under";
}

interface ExistingPick {
  id: string;
  market: string;
  marketKey: string;
  selection: Selection;
  status: string;
  points: number;
}

export function PredictionPanel({
  fixtureId,
  p1,
  p2,
  mode,
  virtualMs,
  allowWinner = true,
}: {
  fixtureId: string;
  p1: string;
  p2: string;
  mode: "replay" | "live";
  virtualMs?: number; // replay clock; winner picks lock after virtual kickoff+60s
  allowWinner?: boolean;
}) {
  const { publicKey, signMessage, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [mine, setMine] = useState<ExistingPick[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const winnerLocked =
    mode === "replay" && virtualMs !== undefined && virtualMs > 60_000;

  useEffect(() => {
    if (!connected) return;
    fetch(`/api/picks?fixtureId=${fixtureId}`)
      .then((r) => r.json())
      .then((d) => setMine(d.picks ?? []))
      .catch(() => {});
  }, [connected, fixtureId]);

  const place = useCallback(
    async (market: "winner" | "hilo", selection: Selection) => {
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
            mode,
            market,
            selection,
            signature: Buffer.from(sig).toString("base64"),
            placedAtVirtualMs: virtualMs,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setNote(data.error ?? "failed");
        } else {
          setMine((m) => [...m, data.pick]);
          setNote("Pick locked in — signed with your wallet ✓");
        }
      } finally {
        setBusy(false);
      }
    },
    [connected, publicKey, signMessage, fixtureId, mode, virtualMs, setVisible]
  );

  const has = (marketKey: string) => mine.some((p) => p.marketKey === marketKey);

  return (
    <div className="glass rounded-xl p-4">
      <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-pitch-300">
        Markets
        {mode === "live" && (
          <span className="rounded-full bg-live/15 px-2.5 py-0.5 text-xs font-semibold text-live">
            ×3 live
          </span>
        )}
      </h3>

      {allowWinner && !has("winner") && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs text-pitch-400">
            Match winner{winnerLocked ? " · locked" : ""}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ["P1", `${flag(p1)} ${p1}`],
                ["X", "Draw"],
                ["P2", `${flag(p2)} ${p2}`],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                disabled={busy || winnerLocked}
                onClick={() => place("winner", { pick: code })}
                className="rounded-lg bg-pitch-800 px-2 py-3 text-sm font-semibold text-pitch-100 transition-colors hover:bg-accent/15 hover:text-accent disabled:opacity-40"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!has("hilo:corners") && (
        <div className="mb-2">
          <p className="mb-1.5 text-xs text-pitch-400">Total corners · 9.5</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              disabled={busy}
              onClick={() => place("hilo", { stat: "corners", line: 9.5, side: "over" })}
              className="rounded-lg bg-success/10 px-2 py-3 text-sm font-semibold text-success transition-colors hover:bg-success/20 disabled:opacity-40"
            >
              Over ↑
            </button>
            <button
              disabled={busy}
              onClick={() => place("hilo", { stat: "corners", line: 9.5, side: "under" })}
              className="rounded-lg bg-danger/10 px-2 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/20 disabled:opacity-40"
            >
              Under ↓
            </button>
          </div>
        </div>
      )}

      {mine.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-pitch-700/40 pt-3 text-sm">
          {mine.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <span className="text-pitch-100">
                {p.market === "winner"
                  ? `Winner: ${p.selection.pick === "P1" ? p1 : p.selection.pick === "P2" ? p2 : "Draw"}`
                  : `${p.selection.stat} ${p.selection.side} ${p.selection.line}`}
              </span>
              <span
                className={
                  p.status === "won"
                    ? "font-semibold text-volt"
                    : p.status === "lost"
                      ? "text-pitch-400"
                      : "text-pitch-300"
                }
              >
                {p.status === "open" ? "pending" : `${p.status} ${p.points ? `+${p.points}` : ""}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {note && <p className="mt-2 text-xs text-volt">{note}</p>}
      {!connected && (
        <p className="mt-2 text-xs text-pitch-400">
          Connect wallet to make picks — signed, gasless, on the leaderboard.
        </p>
      )}
    </div>
  );
}
