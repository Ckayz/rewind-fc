/**
 * Archive raw TxLINE score histories to disk before the retention window
 * slides past them. Run: tsx --env-file=.env.local scripts/archive-raw.ts
 * Output: data/raw/scores-{fixtureId}.sse (gitignored by default — flip if wanted)
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";

const BASE = process.env.TXLINE_BASE_URL ?? "https://txline.txodds.com";
const HEADERS = {
  Authorization: `Bearer ${process.env.TXLINE_JWT}`,
  "X-Api-Token": process.env.TXLINE_API_TOKEN!,
};
const WC = 72;

async function main() {
  mkdirSync("data/raw", { recursive: true });
  const d1 = Math.floor(Date.UTC(2026, 5, 10) / 86_400_000);
  const d2 = Math.floor(Date.UTC(2026, 6, 10) / 86_400_000);
  const fixtures = new Map<number, { Participant1: string; Participant2: string }>();
  for (const d of [d1, d2]) {
    const res = await fetch(
      `${BASE}/api/fixtures/snapshot?startEpochDay=${d}&competitionId=${WC}`,
      { headers: HEADERS }
    );
    for (const f of await res.json()) fixtures.set(f.FixtureId, f);
  }
  let saved = 0;
  for (const [id, f] of fixtures) {
    const path = `data/raw/scores-${id}.sse`;
    if (existsSync(path)) { saved++; continue; }
    const res = await fetch(`${BASE}/api/scores/historical/${id}`, { headers: HEADERS });
    const text = res.ok ? await res.text() : "";
    if (!text.trim()) continue;
    writeFileSync(path, text);
    saved++;
    console.log(`saved ${path} (${(text.length / 1024).toFixed(0)}KB) ${f.Participant1} v ${f.Participant2}`);
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`archived histories for ${saved} fixtures`);
}

main().catch((e) => { console.error(e); process.exit(1); });
