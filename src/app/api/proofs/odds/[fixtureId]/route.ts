import { NextResponse } from "next/server";
import {
  getOddsSnapshot,
  getOddsUpdatesWindow,
  getOddsValidation,
} from "@/lib/txline";
import { checkRoot, oddsRootsPda } from "@/lib/proofs";
import { getTimeline, listFixtures } from "@/lib/data";

interface OddsMsg {
  MessageId?: number;
  Ts?: number;
  SuperOddsType?: string;
  FixtureId?: number;
}

async function latestOddsMessage(fixtureId: string): Promise<OddsMsg | null> {
  const snapshot = (await getOddsSnapshot(fixtureId).catch(() => [])) as OddsMsg[];
  return (
    [...snapshot]
      .sort((a, b) => (b.Ts ?? 0) - (a.Ts ?? 0))
      .find((o) => o.MessageId !== undefined && o.Ts !== undefined) ?? null
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  const { fixtureId } = await params;
  try {
    // odds snapshots only exist for upcoming/live fixtures — fall back to one
    // with an active market so the proof can always be demonstrated
    let provenFixture = fixtureId;
    let record = await latestOddsMessage(fixtureId);
    if (!record) {
      const upcoming = (await listFixtures()).filter(
        (f) => f.status !== "finished"
      );
      for (const f of upcoming) {
        record = await latestOddsMessage(f.fixtureId);
        if (record) {
          provenFixture = f.fixtureId;
          break;
        }
      }
    }
    if (!record) {
      // markets closed everywhere — prove a historical odds message from the
      // requested fixture's own in-play window instead
      const tl = await getTimeline(fixtureId);
      const fromTs = tl?.meta.kickoffTs;
      if (fromTs) {
        outer: for (let ts = fromTs; ts < fromTs + 2 * 3_600_000; ts += 5 * 60_000) {
          const epochDay = Math.floor(ts / 86_400_000);
          const hour = Math.floor((ts % 86_400_000) / 3_600_000);
          const interval = Math.floor((ts % 3_600_000) / (5 * 60_000));
          const arr = (await getOddsUpdatesWindow(epochDay, hour, interval).catch(
            () => []
          )) as OddsMsg[];
          for (const o of arr) {
            if (
              o.MessageId !== undefined &&
              o.Ts !== undefined &&
              (o.FixtureId === undefined || String(o.FixtureId) === fixtureId)
            ) {
              record = o;
              provenFixture = fixtureId;
              break outer;
            }
          }
        }
      }
    }
    if (!record) {
      return NextResponse.json(
        { ok: false, error: "no odds message available on the feed right now" },
        { status: 404 }
      );
    }

    const validation = (await getOddsValidation(
      record.MessageId!,
      record.Ts!
    )) as { odds?: { Ts?: number }; proof?: unknown; mainTreeProof?: unknown };
    const ts = validation.odds?.Ts ?? record.Ts!;

    const root = await checkRoot(oddsRootsPda(ts));
    return NextResponse.json(
      {
        ok: true,
        kind: "odds",
        endpoint: "/api/odds/validation",
        provenFixture,
        fellBack: provenFixture !== fixtureId,
        messageId: record.MessageId,
        market: record.SuperOddsType,
        proofTimestamp: ts,
        proof: validation.proof ?? validation.mainTreeProof ?? null,
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
