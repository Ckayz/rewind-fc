import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getScoresSnapshot, getStatValidation } from "@/lib/txline";

const PROGRAM_ID = new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");
const RPC =
  process.env.SOLANA_RPC ?? "https://solana-rpc.publicnode.com";

/** Per docs: epoch day must come from the proof's own timestamp. */
function deriveScoresRootsPda(proofTimestampMs: number): {
  pda: PublicKey;
  epochDay: number;
} {
  const epochDay = Math.floor(proofTimestampMs / 86_400_000);
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(epochDay);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("daily_scores_roots"), buf],
    PROGRAM_ID
  );
  return { pda, epochDay };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  const { fixtureId } = await params;
  try {
    // find a real, latest score record to prove (need its Seq)
    const snapshot = (await getScoresSnapshot(fixtureId)) as {
      Seq?: number;
      Action?: string;
      Ts?: number;
    }[];
    const record = [...snapshot]
      .reverse()
      .find((r) => typeof r.Seq === "number" && r.Seq > 0);
    if (!record) {
      return NextResponse.json(
        { ok: false, error: "no provable score record for this fixture" },
        { status: 404 }
      );
    }

    // Merkle proof from TxLINE for goals stats (keys 1, 2)
    const validation = (await getStatValidation(
      fixtureId,
      record.Seq!,
      "1,2"
    )) as {
      summary?: { updateStats?: { minTimestamp?: number } };
      eventStatRoot?: number[];
      mainTreeProof?: unknown;
      subTreeProof?: unknown;
      statsToProve?: unknown[];
      statProofs?: unknown[];
    };

    const ts = validation.summary?.updateStats?.minTimestamp;
    if (!ts) {
      return NextResponse.json(
        { ok: false, error: "proof missing timestamp", raw: validation },
        { status: 502 }
      );
    }

    const { pda, epochDay } = deriveScoresRootsPda(ts);
    const conn = new Connection(RPC, "confirmed");
    const account = await conn.getAccountInfo(pda);

    return NextResponse.json(
      {
        ok: true,
        fixtureId,
        seq: record.Seq,
        action: record.Action,
        proofTimestamp: ts,
        epochDay,
        program: PROGRAM_ID.toBase58(),
        rootsPda: pda.toBase58(),
        rootsAccountExists: !!account,
        rootsAccountOwner: account?.owner.toBase58() ?? null,
        rootsAccountDataLen: account?.data.length ?? 0,
        eventStatRoot: validation.eventStatRoot ?? null,
        statsToProve: validation.statsToProve ?? null,
        proofNodes: {
          subTree: validation.subTreeProof ?? null,
          mainTree: validation.mainTreeProof ?? null,
          statProofs: validation.statProofs ?? null,
        },
        explorer: {
          pda: `https://solscan.io/account/${pda.toBase58()}`,
          program: `https://solscan.io/account/${PROGRAM_ID.toBase58()}`,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
