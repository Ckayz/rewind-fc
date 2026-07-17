"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import type { LineupSide } from "@/db/schema";
import { flag } from "@/lib/flags";

export function MvpVote({
  fixtureId,
  p1,
  p2,
  lineups,
}: {
  fixtureId: string;
  p1: string;
  p2: string;
  lineups: { p1: LineupSide; p2: LineupSide };
}) {
  const { publicKey, signMessage, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [tally, setTally] = useState<{ playerName: string; votes: number }[]>([]);
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadTally = useCallback(() => {
    fetch(`/api/mvp/${fixtureId}`)
      .then((r) => r.json())
      .then((d) => setTally(d.tally ?? []))
      .catch(() => {});
  }, [fixtureId]);
  useEffect(loadTally, [loadTally]);
  useEffect(() => {
    if (!connected) return;
    fetch(`/api/picks?fixtureId=${fixtureId}`)
      .then((r) => r.json())
      .then((d) =>
        setVoted(
          (d.picks ?? []).some((p: { marketKey: string }) => p.marketKey === "mvp")
        )
      )
      .catch(() => {});
  }, [connected, fixtureId]);

  const vote = useCallback(
    async (playerId: number, playerName: string) => {
      if (!connected || !publicKey || !signMessage) {
        setVisible(true);
        return;
      }
      setBusy(true);
      try {
        const wallet = publicKey.toBase58();
        const selection = { playerId, playerName };
        const message = `Rewind FC pick\nWallet: ${wallet}\nFixture: ${fixtureId}\nMarket: mvp\nSelection: ${JSON.stringify(selection)}`;
        const sig = await signMessage(new TextEncoder().encode(message));
        const res = await fetch("/api/picks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fixtureId,
            mode: "live",
            market: "mvp",
            selection,
            signature: Buffer.from(sig).toString("base64"),
          }),
        });
        if (res.ok) {
          setVoted(true);
          loadTally();
        }
      } finally {
        setBusy(false);
      }
    },
    [connected, publicKey, signMessage, fixtureId, setVisible, loadTally]
  );

  const totalVotes = tally.reduce((s, t) => s + t.votes, 0);

  return (
    <div className="glass rounded-xl p-4">
      <h3 className="mb-3 font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
        ⭐ Fan MVP — wallet-signed vote
      </h3>

      {tally.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {tally.slice(0, 5).map((t, i) => (
            <div key={t.playerName} className="flex items-center gap-2 text-sm">
              <span className="w-4 text-pitch-400">{i + 1}</span>
              <span className="truncate text-pitch-50">{t.playerName}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pitch-800">
                <motion.div
                  animate={{ width: `${(t.votes / Math.max(1, totalVotes)) * 100}%` }}
                  className="h-full rounded-full bg-gold"
                />
              </div>
              <span className="score-digits w-8 text-right text-gold">
                {t.votes}
              </span>
            </div>
          ))}
        </div>
      )}

      {voted ? (
        <p className="text-sm text-gold">✓ Your vote is on the board — signed and counted.</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-pitch-400">
            Pick your player of the match:
          </p>
          <div className="grid max-h-52 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
            {(["p1", "p2"] as const).flatMap((side) =>
              lineups[side].players
                .filter((pl) => pl.starter)
                .map((pl) => (
                  <button
                    key={pl.id}
                    disabled={busy}
                    onClick={() => vote(pl.id, pl.name)}
                    className="flex items-center gap-1.5 rounded-lg border border-pitch-700 px-2 py-1.5 text-left text-xs text-pitch-100 hover:border-gold hover:text-gold disabled:opacity-50"
                  >
                    <span>{flag(side === "p1" ? p1 : p2)}</span>
                    <span className="score-digits text-pitch-400">{pl.num}</span>
                    <span className="truncate">{pl.name}</span>
                  </button>
                ))
            )}
          </div>
          {!connected && (
            <p className="mt-2 text-xs text-pitch-400">
              Connect wallet to vote — one signed vote per wallet.
            </p>
          )}
        </>
      )}
    </div>
  );
}
