import { NextResponse } from "next/server";
import {
  getFixtureBatchValidation,
  getFixtureUpdatesWindow,
  getFixtureValidation,
} from "@/lib/txline";
import { checkRoot, epochDayFromMs, fixturesRootsPda } from "@/lib/proofs";
import { getFixture } from "@/lib/data";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  const { fixtureId } = await params;
  const wantBatch = new URL(req.url).searchParams.get("batch") === "1";
  try {
    const fixture = await getFixture(fixtureId);

    const validation = (await getFixtureValidation(fixtureId)) as {
      snapshot?: { Ts?: number };
      proof?: unknown;
      mainTreeProof?: unknown;
    };
    const ts = validation.snapshot?.Ts;
    if (!ts) {
      return NextResponse.json(
        { ok: false, error: "fixture proof missing snapshot timestamp", raw: validation },
        { status: 502 }
      );
    }
    const root = await checkRoot(fixturesRootsPda(ts));

    // sibling endpoints: same-hour fixture update feed + whole-batch proof
    let updatesCount: number | null = null;
    let batch: Record<string, unknown> | null = null;
    const epochDay = epochDayFromMs(ts);
    const hour = Math.floor((ts % 86_400_000) / 3_600_000);
    try {
      const updates = await getFixtureUpdatesWindow(epochDay, hour);
      updatesCount = Array.isArray(updates) ? updates.length : null;
    } catch {
      /* window may be empty */
    }
    if (wantBatch) {
      try {
        batch = (await getFixtureBatchValidation(epochDay, hour)) as Record<
          string,
          unknown
        >;
      } catch (e) {
        batch = { error: e instanceof Error ? e.message : String(e) };
      }
    }

    return NextResponse.json(
      {
        ok: true,
        kind: "fixture",
        endpoint: "/api/fixtures/validation",
        fixture: fixture ? `${fixture.p1} v ${fixture.p2}` : fixtureId,
        proofTimestamp: ts,
        proof: validation.proof ?? validation.mainTreeProof ?? null,
        sameHourFixtureUpdates: updatesCount,
        batchValidation: batch,
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
