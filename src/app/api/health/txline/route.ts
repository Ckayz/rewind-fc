import { NextResponse } from "next/server";
import { getFixturesSnapshot } from "@/lib/txline";

export async function GET() {
  try {
    const fixtures = await getFixturesSnapshot();
    return NextResponse.json({
      ok: true,
      fixtureCount: Array.isArray(fixtures) ? fixtures.length : 0,
      sample: Array.isArray(fixtures)
        ? fixtures.slice(0, 3).map((f) => ({
            FixtureId: f.FixtureId,
            Participant1: f.Participant1,
            Participant2: f.Participant2,
            StartTime: f.StartTime,
          }))
        : fixtures,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
