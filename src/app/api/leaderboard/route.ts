import { NextResponse } from "next/server";
import { sql as dsql, desc, eq, sum, count, and } from "drizzle-orm";
import { db } from "@/db";
import { picks, users } from "@/db/schema";
import { settleOpenPicks } from "@/lib/picks";

export const revalidate = 0;

export async function GET() {
  await settleOpenPicks(); // lazy settlement

  const rows = await db
    .select({
      wallet: picks.wallet,
      displayName: users.displayName,
      points: sum(picks.points).mapWith(Number),
      wins: count(dsql`case when ${picks.status} = 'won' then 1 end`),
      total: count(picks.id),
    })
    .from(picks)
    .leftJoin(users, eq(users.wallet, picks.wallet))
    .where(and(dsql`${picks.status} in ('won','lost')`))
    .groupBy(picks.wallet, users.displayName)
    .orderBy(desc(sum(picks.points)));

  return NextResponse.json(
    { leaderboard: rows },
    { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" } }
  );
}
