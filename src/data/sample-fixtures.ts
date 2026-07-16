/**
 * SAMPLE DATA — UI development only.
 * Semifinal/bronze/final entries reflect the real 2026 bracket; earlier rounds
 * are approximate. Everything here is replaced by the TxLINE ingest (DB) once
 * the mainnet API token is active. Do not treat scores as authoritative.
 */

export type Stage = "group" | "r32" | "r16" | "qf" | "sf" | "bronze" | "final";

export interface SampleFixture {
  fixtureId: string;
  p1: string;
  p2: string;
  score?: { p1: number; p2: number; note?: string };
  startTime: string; // ISO
  stage: Stage;
  status: "finished" | "scheduled" | "live";
  venue?: string;
}

export const SAMPLE_FIXTURES: SampleFixture[] = [
  {
    fixtureId: "sample-final",
    p1: "Spain",
    p2: "Argentina",
    startTime: "2026-07-19T19:00:00Z",
    stage: "final",
    status: "scheduled",
    venue: "MetLife Stadium, New York",
  },
  {
    fixtureId: "sample-bronze",
    p1: "France",
    p2: "England",
    startTime: "2026-07-18T20:00:00Z",
    stage: "bronze",
    status: "scheduled",
    venue: "Hard Rock Stadium, Miami",
  },
  {
    fixtureId: "sample-sf1",
    p1: "Spain",
    p2: "France",
    score: { p1: 2, p2: 0 },
    startTime: "2026-07-14T19:00:00Z",
    stage: "sf",
    status: "finished",
    venue: "AT&T Stadium, Arlington",
  },
  {
    fixtureId: "sample-sf2",
    p1: "Argentina",
    p2: "England",
    score: { p1: 3, p2: 1 },
    startTime: "2026-07-15T19:00:00Z",
    stage: "sf",
    status: "finished",
    venue: "Mercedes-Benz Stadium, Atlanta",
  },
  {
    fixtureId: "sample-qf1",
    p1: "France",
    p2: "Morocco",
    score: { p1: 1, p2: 1, note: "France win 3–1 on penalties" },
    startTime: "2026-07-10T19:00:00Z",
    stage: "qf",
    status: "finished",
  },
  {
    fixtureId: "sample-qf2",
    p1: "Spain",
    p2: "Belgium",
    score: { p1: 3, p2: 0 },
    startTime: "2026-07-10T23:00:00Z",
    stage: "qf",
    status: "finished",
  },
  {
    fixtureId: "sample-qf3",
    p1: "England",
    p2: "Norway",
    score: { p1: 2, p2: 1 },
    startTime: "2026-07-11T19:00:00Z",
    stage: "qf",
    status: "finished",
  },
  {
    fixtureId: "sample-qf4",
    p1: "Argentina",
    p2: "Colombia",
    score: { p1: 3, p2: 3, note: "Argentina win 4–0 on penalties" },
    startTime: "2026-07-11T23:00:00Z",
    stage: "qf",
    status: "finished",
  },
  {
    fixtureId: "sample-r16-1",
    p1: "Spain",
    p2: "Portugal",
    score: { p1: 2, p2: 2, note: "Spain advance" },
    startTime: "2026-07-06T19:00:00Z",
    stage: "r16",
    status: "finished",
  },
  {
    fixtureId: "sample-r16-2",
    p1: "France",
    p2: "Paraguay",
    score: { p1: 3, p2: 0 },
    startTime: "2026-07-06T23:00:00Z",
    stage: "r16",
    status: "finished",
  },
  {
    fixtureId: "sample-r16-3",
    p1: "Norway",
    p2: "Brazil",
    score: { p1: 2, p2: 1 },
    startTime: "2026-07-07T19:00:00Z",
    stage: "r16",
    status: "finished",
  },
  {
    fixtureId: "sample-r16-4",
    p1: "Belgium",
    p2: "USA",
    score: { p1: 4, p2: 3, note: "after extra time" },
    startTime: "2026-07-07T23:00:00Z",
    stage: "r16",
    status: "finished",
  },
];

export const STAGE_LABEL: Record<Stage, string> = {
  group: "Group Stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarterfinal",
  sf: "Semifinal",
  bronze: "Third Place",
  final: "Final",
};
