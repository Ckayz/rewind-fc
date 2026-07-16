import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return new TextEncoder().encode(s);
};

const NONCE_TTL_MS = 5 * 60_000;

/** Stateless auth nonce: HMAC(wallet|ts) — no DB row needed. */
export function issueNonce(wallet: string): { nonce: string; ts: number } {
  const ts = Date.now();
  const mac = createHmac("sha256", process.env.SESSION_SECRET!)
    .update(`${wallet}|${ts}`)
    .digest("hex")
    .slice(0, 24);
  return { nonce: `${ts}.${mac}`, ts };
}

export function checkNonce(wallet: string, nonce: string): boolean {
  const [tsStr, mac] = nonce.split(".");
  const ts = Number(tsStr);
  if (!ts || !mac || Date.now() - ts > NONCE_TTL_MS) return false;
  const expect = createHmac("sha256", process.env.SESSION_SECRET!)
    .update(`${wallet}|${ts}`)
    .digest("hex")
    .slice(0, 24);
  const a = Buffer.from(mac);
  const b = Buffer.from(expect);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function loginMessage(wallet: string, nonce: string): string {
  return `Rewind FC — sign in\nWallet: ${wallet}\nNonce: ${nonce}`;
}

const COOKIE = "rewindfc_session";

export async function createSession(wallet: string) {
  const jwt = await new SignJWT({ wallet })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 7 * 86400,
    path: "/",
  });
}

export async function getSessionWallet(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.wallet === "string" ? payload.wallet : null;
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}
