import { NextResponse } from "next/server";
import { getScoresUpdatesWindow } from "@/lib/txline";
import { listFixtures } from "@/lib/data";

const INTERESTING = new Set([
  "kickoff", "goal", "shot", "corner", "var", "var_end", "penalty",
  "substitution", "yellow_card", "red_card", "game_finalised",
]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const epochDay = Number(url.searchParams.get("epochDay"));
  const hour = Number(url.searchParams.get("hour"));
  const interval = Number(url.searchParams.get("interval"));
  if (!Number.isInteger(epochDay) || !Number.isInteger(hour) || !Number.isInteger(interval)) {
    return NextResponse.json({ error: "epochDay, hour, interval required" }, { status: 400 });
  }

  try {
    const [records, fixtures] = await Promise.all([
      getScoresUpdatesWindow(epochDay, hour, interval) as Promise<
        {
          FixtureId?: number;
          Action?: string;
          Seq?: number;
          Clock?: { Seconds: number };
          Stats?: Record<string, number>;
          StatusId?: number;
        }[]
      >,
      listFixtures(),
    ]);

    const names = new Map(
      fixtures.map((f) => [f.fixtureId, { p1: f.p1, p2: f.p2 }])
    );

    const byFixture = new Map<
      string,
      {
        fixtureId: string;
        p1?: string;
        p2?: string;
        score?: { p1: number; p2: number };
        events: { action: string; minute: number | null; seq?: number }[];
      }
    >();

    for (const r of records) {
      if (!r.FixtureId) continue;
      const id = String(r.FixtureId);
      if (!byFixture.has(id)) {
        byFixture.set(id, { fixtureId: id, ...names.get(id), events: [] });
      }
      const g = byFixture.get(id)!;
      if (r.Stats && (r.Stats["1"] !== undefined || r.Stats["2"] !== undefined)) {
        g.score = { p1: r.Stats["1"] ?? g.score?.p1 ?? 0, p2: r.Stats["2"] ?? g.score?.p2 ?? 0 };
      }
      if (r.Action && INTERESTING.has(r.Action)) {
        g.events.push({
          action: r.Action,
          minute: r.Clock ? Math.floor(r.Clock.Seconds / 60) : null,
          seq: r.Seq,
        });
      }
    }

    // past windows are immutable → cache hard
    const nowWindow =
      Math.floor(Date.now() / 86_400_000) === epochDay &&
      Math.floor((Date.now() % 86_400_000) / 3_600_000) === hour;
    return NextResponse.json(
      {
        ok: true,
        window: { epochDay, hour, interval },
        totalRecords: records.length,
        fixtures: [...byFixture.values()],
      },
      {
        headers: {
          "Cache-Control": nowWindow
            ? "public, s-maxage=15"
            : "public, max-age=31536000, immutable",
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
