"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export function WalletButton() {
  const { publicKey, signMessage, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [sessionWallet, setSessionWallet] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = useCallback(async () => {
    if (!publicKey || !signMessage) return;
    setBusy(true);
    try {
      const wallet = publicKey.toBase58();
      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      const { nonce, message } = await nonceRes.json();
      const sig = await signMessage(new TextEncoder().encode(message));
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          nonce,
          signature: Buffer.from(sig).toString("base64"),
        }),
      });
      if (verifyRes.ok) setSessionWallet(wallet);
    } finally {
      setBusy(false);
    }
  }, [publicKey, signMessage]);

  // auto sign-in once wallet connects
  useEffect(() => {
    if (connected && publicKey && !sessionWallet && !busy) void signIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey?.toBase58()]);

  if (sessionWallet) {
    const short = `${sessionWallet.slice(0, 4)}…${sessionWallet.slice(-4)}`;
    return (
      <button
        onClick={() => {
          void disconnect();
          setSessionWallet(null);
        }}
        className="rounded-lg border border-volt/40 px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-volt hover:bg-volt/10"
        title="Disconnect"
      >
        {short}
      </button>
    );
  }

  return (
    <button
      onClick={() => (connected ? void signIn() : setVisible(true))}
      disabled={busy}
      className="rounded-lg bg-volt px-3 py-1.5 font-display text-sm font-bold uppercase tracking-wide text-pitch-950 transition-transform hover:scale-105 disabled:opacity-60"
    >
      {busy ? "Signing…" : "Connect"}
    </button>
  );
}
