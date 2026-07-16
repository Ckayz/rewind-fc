import { NextResponse } from "next/server";
import { getScoresSnapshot, getStatValidationV3 } from "@/lib/txline";
import { checkRoot, scoresRootsPda } from "@/lib/proofs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  const { fixtureId } = await params;
  try {
    const snapshot = (await getScoresSnapshot(fixtureId)) as {
      Seq?: number;
      Action?: string;
    }[];
    const record = [...snapshot]
      .reverse()
      .find((r) => typeof r.Seq === "number" && r.Seq > 0);
    if (!record) {
      return NextResponse.json(
        { ok: false, error: "no provable score record" },
        { status: 404 }
      );
    }

    // three-level multiproof: goals + corners for both teams
    const validation = (await getStatValidationV3(
      fixtureId,
      record.Seq!,
      "1,2,7,8"
    )) as {
      summary?: { updateStats?: { minTimestamp?: number } };
      statsToProve?: unknown[];
      eventStatRoot?: number[];
    };
    const ts = validation.summary?.updateStats?.minTimestamp;
    if (!ts) {
      return NextResponse.json(
        { ok: false, error: "proof missing timestamp" },
        { status: 502 }
      );
    }

    const root = await checkRoot(scoresRootsPda(ts));
    return NextResponse.json(
      {
        ok: true,
        kind: "score",
        endpoint: "/api/scores/stat-validation-v3",
        seq: record.Seq,
        proofTimestamp: ts,
        statsProven: validation.statsToProve ?? null,
        eventStatRoot: validation.eventStatRoot ?? null,
        ...root,
      },
      { headers: { "Cache-Control": "public, s-maxage=3600" } }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
