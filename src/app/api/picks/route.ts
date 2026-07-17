import { NextResponse } from "next/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { picks } from "@/db/schema";
import { getSessionWallet } from "@/lib/session";
import {
  canonicalPickMessage,
  ensureUser,
  marketKeyOf,
  type PickSelection,
} from "@/lib/picks";
import { getFixture } from "@/lib/data";

export async function GET(req: Request) {
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ picks: [] });
  const url = new URL(req.url);
  const fixtureId = url.searchParams.get("fixtureId");
  const rows = await db
    .select()
    .from(picks)
    .where(
      fixtureId
        ? and(eq(picks.wallet, wallet), eq(picks.fixtureId, fixtureId))
        : eq(picks.wallet, wallet)
    );
  return NextResponse.json({ picks: rows });
}

export async function POST(req: Request) {
  const wallet = await getSessionWallet();
  if (!wallet) return NextResponse.json({ error: "connect wallet" }, { status: 401 });

  const body = await req.json();
  const { fixtureId, mode, market, selection, signature, placedAtVirtualMs } =
    body as {
      fixtureId: string;
      mode: "replay" | "live";
      market: string;
      selection: PickSelection;
      signature: string;
      placedAtVirtualMs?: number;
    };

  if (
    !fixtureId ||
    !["replay", "live"].includes(mode) ||
    !["winner", "hilo", "exact_score", "first_scorer", "mvp"].includes(market)
  ) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const fixture = await getFixture(fixtureId);
  if (!fixture) return NextResponse.json({ error: "unknown fixture" }, { status: 404 });

  // live picks lock at kickoff (mvp votes stay open on finished matches)
  if (
    mode === "live" &&
    market !== "mvp" &&
    Date.now() >= fixture.startTime.getTime()
  ) {
    return NextResponse.json({ error: "match already kicked off" }, { status: 409 });
  }

  // wallet-signed pick = tamper-evident leaderboard
  const message = canonicalPickMessage(wallet, fixtureId, market, selection);
  let ok = false;
  try {
    ok = nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      Buffer.from(signature, "base64"),
      bs58.decode(wallet)
    );
  } catch {
    ok = false;
  }
  if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  await ensureUser(wallet);
  try {
    const [row] = await db
      .insert(picks)
      .values({
        wallet,
        fixtureId,
        mode,
        market,
        selection: selection as Record<string, unknown>,
        marketKey: marketKeyOf(market, selection),
        placedAtVirtualMs: placedAtVirtualMs ?? null,
        signedMessage: message,
        signature,
      })
      .returning();
    return NextResponse.json({ ok: true, pick: row });
  } catch {
    return NextResponse.json(
      { error: "you already picked this market for this match" },
      { status: 409 }
    );
  }
}
