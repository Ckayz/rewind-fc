import { ImageResponse } from "next/og";
import { getFixture, getTimeline } from "@/lib/data";
import { flag } from "@/lib/flags";
import { STAGE_LABEL } from "@/data/sample-fixtures";

export const runtime = "nodejs";
export const alt = "Rewind FC match card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  const { fixtureId } = await params;
  const fixture = await getFixture(fixtureId);
  const timeline = fixture?.hasTimeline ? await getTimeline(fixtureId) : null;
  const scorers =
    timeline?.items
      .filter((i) => i.kind === "score" && (i.payload as { type?: string }).type === "goal")
      .map((i) => (i.payload as { text?: string }).text?.replace("GOAL — ", ""))
      .filter(Boolean)
      .slice(0, 5) ?? [];

  const p1 = fixture?.p1 ?? "Rewind";
  const p2 = fixture?.p2 ?? "FC";
  const score = fixture?.score;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #0e1510 0%, #070b08 100%)",
          color: "#e8f0e6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 10, color: "#7a8a7c", textTransform: "uppercase" }}>
          {fixture ? STAGE_LABEL[fixture.stage] : "World Cup 2026"}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 50,
            marginTop: 30,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 340 }}>
            <div style={{ fontSize: 110, display: "flex" }}>{flag(p1)}</div>
            <div style={{ fontSize: 44, fontWeight: 700, textTransform: "uppercase", display: "flex" }}>{p1}</div>
          </div>
          <div style={{ display: "flex", fontSize: 160, fontWeight: 800, color: "#c6ff00" }}>
            {score ? `${score.p1}–${score.p2}` : "VS"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 340 }}>
            <div style={{ fontSize: 110, display: "flex" }}>{flag(p2)}</div>
            <div style={{ fontSize: 44, fontWeight: 700, textTransform: "uppercase", display: "flex" }}>{p2}</div>
          </div>
        </div>
        {scorers.length > 0 && (
          <div style={{ display: "flex", fontSize: 28, color: "#cdd8cc", marginTop: 18 }}>
            ⚽ {scorers.join(" · ")}
          </div>
        )}
        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 32,
            color: "#c6ff00",
            textTransform: "uppercase",
            letterSpacing: 6,
            fontWeight: 700,
          }}
        >
          ⏪ Rewind FC — replay it live
        </div>
        <div style={{ display: "flex", fontSize: 20, color: "#55684f", marginTop: 10 }}>
          powered by TxLINE on Solana · rewind-fc.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
