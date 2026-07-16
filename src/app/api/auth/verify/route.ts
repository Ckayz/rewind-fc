import { NextResponse } from "next/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
import {
  checkNonce,
  createSession,
  loginMessage,
} from "@/lib/session";

export async function POST(req: Request) {
  const { wallet, nonce, signature } = await req.json();
  if (
    typeof wallet !== "string" ||
    typeof nonce !== "string" ||
    typeof signature !== "string"
  ) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!checkNonce(wallet, nonce)) {
    return NextResponse.json({ error: "nonce expired" }, { status: 401 });
  }

  const message = new TextEncoder().encode(loginMessage(wallet, nonce));
  let ok = false;
  try {
    ok = nacl.sign.detached.verify(
      message,
      Buffer.from(signature, "base64"),
      bs58.decode(wallet)
    );
  } catch {
    ok = false;
  }
  if (!ok) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  await createSession(wallet);
  return NextResponse.json({ ok: true, wallet });
}
