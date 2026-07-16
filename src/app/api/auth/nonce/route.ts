import { NextResponse } from "next/server";
import { issueNonce, loginMessage } from "@/lib/session";

export async function POST(req: Request) {
  const { wallet } = await req.json();
  if (typeof wallet !== "string" || wallet.length < 32 || wallet.length > 44) {
    return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  }
  const { nonce } = issueNonce(wallet);
  return NextResponse.json({ nonce, message: loginMessage(wallet, nonce) });
}
