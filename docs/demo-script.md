# Demo video script — ≤5 min, record against https://rewind-fc.vercel.app

Screen-record at 1440p+, phone-frame optional for one mobile shot. Talk fast, show faster.

## Shot list

**0:00–0:25 — Hook (hub page)**
> "The World Cup ends Sunday. Every live-score app dies with it. Rewind FC keeps it alive — every knockout match replayable as if live, every data point provable on Solana. Built on TxLINE, using all nineteen of its endpoints."

Scroll the hub: flags, bracket teaser, replay rail.

**0:25–1:30 — Time Machine (the hero)**
Open England v Argentina (`/match/18241006`) → hit ▶ Replay.
- Point out the ticking clock, real events firing (54' England goal → 87'+91' Argentina).
- The odds chart drawing itself: "these are real StablePrice ticks — watch England's price collapse as Argentina score."
- Scrub the seek bar, flip to ×120.

**1:30–2:10 — Predictions**
During the replay: connect Phantom → sign a winner pick (show the signMessage popup).
> "Picks are gasless wallet signatures — the leaderboard is tamper-evident because every entry carries its ed25519 signature."

Show pick settling → leaderboard page.

**2:10–3:10 — Proof Room (judge candy)**
`/proofs` → select the semifinal → run all three proofs.
> "TxODDS publishes daily Merkle roots to Solana. Score stats, odds messages, and fixture records each prove against their own on-chain root — watch: fetch proof, derive the PDA from the proof's own timestamp, read mainnet."

Click through to Solscan on the score proof.

**3:10–3:50 — Matchday Pulse**
`/pulse` → "SF: France v Spain — closing stages" → step ±5 min.
> "The whole tournament, five minutes at a time — TxLINE's time-window feed lets you read the tournament's heartbeat at any moment in history."

**3:50–4:30 — Live mode** *(record during bronze match Jul 18 21:00 UTC or final Jul 19 19:00 UTC)*
Open the live match page: streaming badge, live score, StablePrice market card updating.
> "And when a match is actually live — sub-10-second updates over TxLINE's real-time tier, SSE streamed straight to the page."

*(Fallback if recording pre-match: show the final's match page with live pre-match odds + prediction panel, mention kickoff.)*

**4:30–5:00 — Close (about page)**
Scroll the 19/19 endpoint table + business model.
> "Nineteen of nineteen TxLINE endpoints, a real business model, deployed on Vercel, verified on Solana. Rewind FC — every match, rewound live."

## Recording notes
- Do a dry click-through first; replays cache, so second run is snappier.
- Have Phantom unlocked with the burner wallet before recording.
- Mute notifications. 1 take for hero shots, stitch cuts elsewhere.
