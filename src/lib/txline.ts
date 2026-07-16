import "server-only";

/**
 * Server-only TxLINE client. Credentials never reach the browser.
 * All data endpoints require BOTH headers:
 *   Authorization: Bearer <guest JWT>   (30-day lifetime)
 *   X-Api-Token: <activated API token>  (from on-chain subscription)
 */

const BASE = process.env.TXLINE_BASE_URL ?? "https://txline.txodds.com";

function authHeaders(): HeadersInit {
  const jwt = process.env.TXLINE_JWT;
  const apiToken = process.env.TXLINE_API_TOKEN;
  if (!jwt || !apiToken) {
    throw new Error("TXLINE_JWT / TXLINE_API_TOKEN env vars are not set");
  }
  return {
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": apiToken,
    "Content-Type": "application/json",
  };
}

export class TxLineError extends Error {
  constructor(
    public status: number,
    public url: string,
    body: string
  ) {
    super(`TxLINE ${status} on ${url}: ${body.slice(0, 200)}`);
  }
}

async function get<T>(path: string, revalidate?: number): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: authHeaders(),
    ...(revalidate !== undefined
      ? { next: { revalidate } }
      : { cache: "no-store" }),
  });
  if (!res.ok) throw new TxLineError(res.status, url, await res.text());
  return res.json() as Promise<T>;
}

// ---- Raw payload types (loose until schemas confirmed from live payloads) ----

export interface RawFixture {
  FixtureId: number | string;
  Participant1: string;
  Participant2: string;
  Participant1IsHome: boolean;
  StartTime: string;
  GameState: number; // 1 = scheduled, 6 = cancelled
  [k: string]: unknown;
}

export type RawScoreUpdate = Record<string, unknown>;
export type RawOddsEntry = Record<string, unknown>;

// ---- Endpoints ----

export function getFixturesSnapshot(competitionId?: string) {
  const q = competitionId ? `?competitionId=${competitionId}` : "";
  return get<RawFixture[]>(`/api/fixtures/snapshot${q}`, 60);
}

export function getScoresSnapshot(fixtureId: string | number) {
  return get<RawScoreUpdate[]>(`/api/scores/snapshot/${fixtureId}`, 5);
}

export function getScoresUpdates(fixtureId: string | number) {
  return get<RawScoreUpdate[]>(`/api/scores/updates/${fixtureId}`);
}

export function getScoresUpdatesWindow(
  epochDay: number,
  hourOfDay: number,
  interval: number
) {
  return get<RawScoreUpdate[]>(
    `/api/scores/updates/${epochDay}/${hourOfDay}/${interval}`
  );
}

export function getOddsSnapshot(fixtureId: string | number) {
  return get<RawOddsEntry[]>(`/api/odds/snapshot/${fixtureId}`, 5);
}

export function getOddsUpdatesWindow(
  epochDay: number,
  hourOfDay: number,
  interval: number
) {
  return get<RawOddsEntry[]>(
    `/api/odds/updates/${epochDay}/${hourOfDay}/${interval}`
  );
}

export function getStatValidation(
  fixtureId: string | number,
  seq: number,
  statKeys: string
) {
  return get<Record<string, unknown>>(
    `/api/scores/stat-validation?fixtureId=${fixtureId}&seq=${seq}&statKeys=${statKeys}`
  );
}

export function getStatValidationV3(
  fixtureId: string | number,
  seq: number,
  statKeys: string
) {
  return get<Record<string, unknown>>(
    `/api/scores/stat-validation-v3?fixtureId=${fixtureId}&seq=${seq}&statKeys=${statKeys}`
  );
}

export function getOddsValidation(messageId: number | string, ts: number) {
  return get<Record<string, unknown>>(
    `/api/odds/validation?messageId=${messageId}&ts=${ts}`
  );
}

export function getFixtureValidation(
  fixtureId: string | number,
  timestamp?: number
) {
  const q = timestamp !== undefined ? `&timestamp=${timestamp}` : "";
  return get<Record<string, unknown>>(
    `/api/fixtures/validation?fixtureId=${fixtureId}${q}`
  );
}

export function getFixtureBatchValidation(epochDay: number, hourOfDay: number) {
  return get<Record<string, unknown>>(
    `/api/fixtures/batch-validation?epochDay=${epochDay}&hourOfDay=${hourOfDay}`
  );
}

export function getFixtureUpdatesWindow(epochDay: number, hourOfDay: number) {
  return get<Record<string, unknown>[]>(
    `/api/fixtures/updates/${epochDay}/${hourOfDay}`
  );
}

export function getOddsUpdatesLive(fixtureId: string | number) {
  return get<RawOddsEntry[]>(`/api/odds/updates/${fixtureId}`);
}

export const epochDayFromMs = (ms: number) => Math.floor(ms / 86_400_000);
