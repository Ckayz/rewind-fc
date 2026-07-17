# ⚽ Rewind FC — the World Cup fan terminal on TxLINE × Solana

**Watch it. Predict it. Make the market.** Rewind FC turns TxLINE's verifiable match data into a full fan-trading experience: every knockout match replayable as if live, a momentum model that calls the next five minutes, and a **market-making desk** where liquidity providers earn on forecast-priced in-play markets — every data point Merkle-anchored to Solana by [TxLINE](https://txline-docs.txodds.com).

**Live app:** https://rewind-fc.vercel.app

Built solo in 48h for the **TxODDS × Solana World Cup Hackathon** (Consumer & Fan Experiences track) on Superteam Earn.

## 💧 The Liquidity Desk — the core engine

The economic heart of Rewind FC (`/desk`), a paper-trading desk today with venue integration as the next milestone:

- **LP Rewards program** — mirrors Polymarket's documented liquidity-rewards mechanics exactly: order score `S = ((v − s)/v)²` (quadratic reward for quoting tight to the midpoint), one-sided books earn ⅓, daily epochs, pro-rata pool payouts, $1 minimum. Provide size + spread on any market and watch projected daily earnings react in real time.
- **Forecast-priced 5-minute markets** — our momentum model (zone pressure + shots + corners over a 10-min lookback → Poisson intensities) prices "who scores next?" markets for every 5-minute window; the parent match-winner market is implied from StablePrice consensus odds.
- **18-wallet inventory router** — an MM's parent-market inventory is fanned across wallets into the sub-markets, with an explicit **no-self-cross guard** (one own-wallet per book side — the line between capacity fan-out and wash trading) and the residual delta netted into a single parent hedge.
- **Verifiable settlement** — every sub-market resolves against TxLINE's Merkle-anchored feed; the same proof system is user-inspectable in the Proof Room.

The same forecast that powers the desk is scored publicly in replays ("✓ Called it" — e.g. Argentina at 20% one minute before their 87' winner), so the pricing engine's accuracy is demonstrable, not claimed.

## What else it does

- **🕰 Time Machine replay** — the full match log from `GET /api/scores/historical/{fixtureId}` (kickoff, goals, cards, VAR, penalties, `Clock` seconds) is merged with 5-minute-bucket odds history into one compiled timeline, then replayed client-side on a virtual clock at ×30/×60/×120 with scrubbing. The odds chart draws itself as the match unfolds.
- **📡 Zone Radar** — bet365-style animated 2D pitch driven by TxLINE possession states (`Participant` + `PossessionType` on every record): the ball glides between thirds, possession tints the attacking half, and shots/corners/goals ping on the pitch — live during matches and inside every replay. (Honest data note: zone-level ball territory, not optical player tracking — no free tracking feed exists for WC 2026; this is the same event-driven technique betting sites use.)
- **📺 Match Cinema** — official FIFA highlight embeds per match (youtube-nocookie, verified IDs) with rights-safe broadcaster link-outs for live games.
- **👥 Player layer** — starting lineups with shirt numbers, named goalscorers ("GOAL — Gordon (England)"), sub on/off names and per-player full-time stats, all extracted from the scores feed's `lineups` action and `PlayerStats` payloads (undocumented but present in the OpenAPI schemas — see `/about` feedback).
- **⛓ Verify on Solana** — any match's stats are proven against TxLINE's on-chain daily Merkle roots: fetch proof from `/api/scores/stat-validation`, derive the `daily_scores_roots` PDA from the proof's own timestamp, read the root account on mainnet, link to the explorer.
- **🎯 Wallet-signed predictions** — winner + hi-lo picks signed with `signMessage` (gasless). The leaderboard is tamper-evident: every entry carries its ed25519 signature.
- **🔴 Live mode** — for in-play matches (bronze final July 18, final July 19) the app polls a CDN-collapsed proxy of TxLINE's **real-time tier (service level 12)**.

## Architecture

```
TxLINE mainnet ──► scripts/ingest.ts (local) ──► Neon Postgres
  fixtures/snapshot     parse SSE logs             fixtures
  scores/historical     merge odds buckets         timelines (JSONB, immutable)
  odds/updates/{d}/{h}/{i}                         users / picks
                                                      │
Vercel ◄──────────────────────────────────────────────┘
  server proxy (creds never reach client)
  /api/live/[id]   s-maxage=5 poll collapse
  /api/verify/[id] proof → PDA → mainnet account
  client: ReplayPlayer (virtual clock) · wallet-adapter · Recharts
```

- **Auth to TxLINE:** guest JWT (30d) + API token activated by an on-chain `subscribe` on the txoracle program (`9ExbZ…cKaA`). Both sent on every call (`Authorization: Bearer` + `X-Api-Token`), server-side only.
- **Replay engine:** timelines are immutable once a match finishes → cached forever. Playback is pure client-side folding (`foldTimeline(items, t)`), so replays cost zero server compute and survive any API outage.
- **Picks settlement:** lazy server-side settlement recomputes results from the same timeline data (corners from event folds, winners from stat keys `1`/`2`, penalty shootouts from `6001`/`6002`).

## Run it

```bash
pnpm install
cp .env.example .env.local   # fill in:
#  TXLINE_BASE_URL=https://txline.txodds.com
#  TXLINE_JWT=            (POST /auth/guest/start)
#  TXLINE_API_TOKEN=      (on-chain subscribe + /api/token/activate — see TxLINE docs)
#  DATABASE_URL=          (Postgres)
#  SESSION_SECRET=        (random 32 bytes)

pnpm db:push     # create schema
pnpm ingest      # pull fixtures + histories + odds → compile timelines
pnpm dev
```

`pnpm ingest --missing` resumes, skipping fixtures already compiled.

## TxLINE endpoint coverage — 19/19

| Endpoint | Powers |
|---|---|
| `auth/guest/start` · `token/activate` | session + on-chain subscription |
| `guest/purchase/quote` | live upgrade quote on `/about` |
| `fixtures/snapshot?startEpochDay` | all 106 WC fixtures |
| `fixtures/updates/{d}/{h}` · `fixtures/validation` · `fixtures/batch-validation` | Proof Room fixture proofs |
| `odds/snapshot/{id}` · `odds/updates/{id}` · `odds/stream` | live market card + catch-up + SSE |
| `odds/updates/{d}/{h}/{i}` | replay odds curves (ingest) |
| `odds/validation` | Proof Room odds proof |
| `scores/snapshot/{id}` · `scores/updates/{id}` · `scores/stream` | live state + catch-up + SSE |
| `scores/updates/{d}/{h}/{i}` | **Matchday Pulse** (`/pulse`) |
| `scores/historical/{id}` | **Time Machine** replays |
| `scores/stat-validation` · `scores/stat-validation-v3` | verify button + Proof Room multiproof |

## Stat encodings used (TxLINE soccer feed)

| Key | Meaning | | Prefix | Period |
|---|---|---|---|---|
| 1/2 | P1/P2 goals | | 0 | full game |
| 3/4 | yellows | | 1000 | H1 |
| 5/6 | reds | | 3000 | H2 |
| 7/8 | corners | | 6000 | penalty shootout |

## Roadmap & scope notes

- **Desk execution:** the Liquidity Desk runs the full pricing/routing/rewards engine on live data in paper-trading mode; venue integration (order execution + on-chain settlement of the 5-min markets against TxLINE proofs) is the next milestone.
- Group-stage replays are unavailable — TxLINE's historical retention had already expired for June matches when we ingested (July 17). All knockout matches are in.
- Replay-mode picks can theoretically be "cheated" by someone who knows the result — that's why live picks score **×3**.


