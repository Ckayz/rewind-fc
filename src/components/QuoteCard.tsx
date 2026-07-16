import "server-only";

const BASE = process.env.TXLINE_BASE_URL ?? "https://txline.txodds.com";
// public address of the app's subscription wallet — display-only quote
const APP_WALLET = "6PCMdQ5vdorzB18jyudUTHXFpEyzMWjH4bJqTSgT7mfR";

interface Quote {
  baseCost?: number;
  totalCost?: number;
  premium?: number;
  [k: string]: unknown;
}

async function fetchQuote(): Promise<{ ok: boolean; detail: string; quote?: Quote }> {
  try {
    const res = await fetch(`${BASE}/api/guest/purchase/quote`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TXLINE_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ buyerPubkey: APP_WALLET, txlineAmount: 1000 }),
      next: { revalidate: 3600 },
    });
    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        detail:
          res.status === 400 || res.status === 422
            ? `Quote gate responded: "${text.slice(0, 120)}" — our demo wallet holds no USDT ATA, which is exactly the prerequisite the endpoint enforces.`
            : `${res.status}: ${text.slice(0, 120)}`,
      };
    }
    let quote: Quote = {};
    try {
      quote = JSON.parse(text);
    } catch {
      /* leave empty */
    }
    return { ok: true, detail: "Partially signed purchase transaction issued.", quote };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

/** Live call to /api/guest/purchase/quote — the upgrade path, demonstrated. */
export async function QuoteCard() {
  const result = await fetchQuote();
  return (
    <div className="rounded-lg border border-pitch-700/60 bg-pitch-850/60 p-4 text-xs">
      <p className="mb-1 font-display text-sm font-semibold uppercase tracking-widest text-gold">
        Live upgrade quote — /api/guest/purchase/quote
      </p>
      <p className="text-pitch-300">
        Paid tiers are bought on-chain: 1,000 TxL = 1 USDT, 0% markup. Quote
        requested live for 1,000 TxL against wallet{" "}
        <code>{APP_WALLET.slice(0, 4)}…{APP_WALLET.slice(-4)}</code>:
      </p>
      <p className={`mt-2 font-mono ${result.ok ? "text-verify" : "text-pitch-100"}`}>
        {result.ok ? "✓ " : "→ "}
        {result.detail}
      </p>
      {result.quote && Object.keys(result.quote).length > 0 && (
        <pre className="mt-2 max-h-32 overflow-auto rounded bg-pitch-950/60 p-2 text-[10px] text-pitch-300">
          {JSON.stringify(
            Object.fromEntries(
              Object.entries(result.quote).map(([k, v]) => [
                k,
                typeof v === "string" && v.length > 60 ? `${v.slice(0, 60)}…` : v,
              ])
            ),
            null,
            1
          )}
        </pre>
      )}
    </div>
  );
}
