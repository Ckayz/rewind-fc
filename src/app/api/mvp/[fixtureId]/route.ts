import { NextResponse } from "next/server";
import { sql as dsql, and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { picks } from "@/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fixtureId: string }> }
) {
  const { fixtureId } = await params;
  const rows = await db
    .select({
      playerName: dsql<string>`${picks.selection}->>'playerName'`,
      votes: count(picks.id),
    })
    .from(picks)
    .where(and(eq(picks.fixtureId, fixtureId), eq(picks.market, "mvp")))
    .groupBy(dsql`${picks.selection}->>'playerName'`)
    .orderBy(desc(count(picks.id)));

  return NextResponse.json(
    { tally: rows },
    { headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=30" } }
  );
}
