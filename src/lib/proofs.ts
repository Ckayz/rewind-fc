import "server-only";
import { Connection, PublicKey } from "@solana/web3.js";

export const TXORACLE_PROGRAM = new PublicKey(
  "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"
);
const RPC = process.env.SOLANA_RPC ?? "https://solana-rpc.publicnode.com";

export const solana = () => new Connection(RPC, "confirmed");

export function epochDayFromMs(ms: number): number {
  const d = Math.floor(ms / 86_400_000);
  if (!Number.isSafeInteger(ms) || ms < 0 || d > 0xffff) {
    throw new Error("proof timestamp outside u16 epoch-day range");
  }
  return d;
}

function pdaU16(seed: string, epochDay: number): PublicKey {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(epochDay);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(seed), buf],
    TXORACLE_PROGRAM
  )[0];
}

/** Per docs: epochDay must come from the proof's own timestamp, never Date.now(). */
export const scoresRootsPda = (proofTsMs: number) => {
  const epochDay = epochDayFromMs(proofTsMs);
  return { pda: pdaU16("daily_scores_roots", epochDay), epochDay };
};

export const oddsRootsPda = (proofTsMs: number) => {
  const epochDay = epochDayFromMs(proofTsMs);
  return { pda: pdaU16("daily_batch_roots", epochDay), epochDay };
};

export const fixturesRootsPda = (proofTsMs: number) => {
  const epochDay = epochDayFromMs(proofTsMs);
  const aligned = Math.floor(epochDay / 10) * 10;
  return { pda: pdaU16("ten_daily_fixtures_roots", aligned), epochDay: aligned };
};

export interface RootCheck {
  rootsPda: string;
  epochDay: number;
  rootsAccountExists: boolean;
  rootsAccountOwner: string | null;
  rootsAccountDataLen: number;
  explorer: { pda: string; program: string };
}

export async function checkRoot(derived: {
  pda: PublicKey;
  epochDay: number;
}): Promise<RootCheck> {
  const account = await solana().getAccountInfo(derived.pda);
  return {
    rootsPda: derived.pda.toBase58(),
    epochDay: derived.epochDay,
    rootsAccountExists: !!account,
    rootsAccountOwner: account?.owner.toBase58() ?? null,
    rootsAccountDataLen: account?.data.length ?? 0,
    explorer: {
      pda: `https://solscan.io/account/${derived.pda.toBase58()}`,
      program: `https://solscan.io/account/${TXORACLE_PROGRAM.toBase58()}`,
    },
  };
}
