import { NextResponse } from "next/server";

export const maxDuration = 300; // Fluid compute; client reconnects on recycle

const BASE = process.env.TXLINE_BASE_URL ?? "https://txline.txodds.com";

/**
 * SSE pass-through of TxLINE's scores/odds streams.
 * Credentials stay server-side; optional ?fixtureId= filter applied here.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ feed: string }> }
) {
  const { feed } = await params;
  if (feed !== "scores" && feed !== "odds") {
    return NextResponse.json({ error: "unknown feed" }, { status: 404 });
  }
  const fixtureId = new URL(req.url).searchParams.get("fixtureId");

  const upstream = await fetch(`${BASE}/api/${feed}/stream`, {
    headers: {
      Authorization: `Bearer ${process.env.TXLINE_JWT}`,
      "X-Api-Token": process.env.TXLINE_API_TOKEN!,
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
    signal: req.signal,
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `upstream ${upstream.status}` },
      { status: 502 }
    );
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`retry: 3000\n\n`));
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: hb ${Math.floor(performance.now())}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // forward complete SSE events; filter by fixtureId when asked
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const ev of events) {
            if (!ev.trim()) continue;
            if (fixtureId) {
              const dataLine = ev
                .split("\n")
                .find((l) => l.startsWith("data:"));
              if (dataLine && !dataLine.includes(`"FixtureId":${fixtureId}`)) {
                continue;
              }
            }
            controller.enqueue(encoder.encode(ev + "\n\n"));
          }
        }
      } catch {
        /* upstream closed */
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
