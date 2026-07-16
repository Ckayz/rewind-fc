import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { fixtures, timelines, type CompiledTimeline } from "@/db/schema";
import type { Stage } from "@/data/sample-fixtures";

export interface Fixture {
  fixtureId: string;
  p1: string;
  p2: string;
  startTime: Date;
  stage: Stage;
  score?: { p1: number; p2: number; note?: string };
  status: "finished" | "scheduled" | "live";
  hasTimeline: boolean;
}

function toFixture(row: typeof fixtures.$inferSelect): Fixture {
  const now = Date.now();
  const start = row.startTime.getTime();
  const finished = !!row.finalScore;
  // no live scores row yet + kickoff passed but no final → treat as live window
  const live = !finished && start <= now && now - start < 4 * 3_600_000;
  return {
    fixtureId: row.fixtureId,
    p1: row.p1,
    p2: row.p2,
    startTime: row.startTime,
    stage: (row.stage ?? "group") as Stage,
    score: row.finalScore
      ? { p1: row.finalScore.p1, p2: row.finalScore.p2, note: row.finalScore.detail }
      : undefined,
    status: finished ? "finished" : live ? "live" : "scheduled",
    hasTimeline: row.hasTimeline,
  };
}

export async function listFixtures(): Promise<Fixture[]> {
  const rows = await db.select().from(fixtures).orderBy(asc(fixtures.startTime));
  return rows.map(toFixture);
}

export async function getFixture(fixtureId: string): Promise<Fixture | null> {
  const rows = await db
    .select()
    .from(fixtures)
    .where(eq(fixtures.fixtureId, fixtureId))
    .limit(1);
  return rows[0] ? toFixture(rows[0]) : null;
}

export async function getTimeline(
  fixtureId: string
): Promise<CompiledTimeline | null> {
  const rows = await db
    .select({ compiled: timelines.compiled })
    .from(timelines)
    .where(eq(timelines.fixtureId, fixtureId))
    .limit(1);
  return rows[0]?.compiled ?? null;
}
