"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TrackingData {
  fps: number;
  source: string;
  home: string[];
  away: string[];
  frames: (number | null)[][];
}

const SPEEDS = [1, 2, 4];

/**
 * Real optical tracking playback — Metrica Sports open data.
 * Canvas-rendered: 23 entities × 30fps interpolation stays cheap.
 */
export function TrackingLab() {
  const [data, setData] = useState<TrackingData | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [progress, setProgress] = useState(0); // frame float
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const state = useRef({ t: 0, playing: false, speed: 2 });
  state.current.playing = playing;
  state.current.speed = speed;

  useEffect(() => {
    fetch("/lab/tracking.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const draw = useCallback(
    (tFrame: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !data) return;
      const ctx = canvas.getContext("2d")!;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // pitch
      ctx.strokeStyle = "rgba(122,138,124,0.4)";
      ctx.lineWidth = 1.5;
      const M = 14;
      ctx.strokeRect(M, M, W - 2 * M, H - 2 * M);
      ctx.beginPath();
      ctx.moveTo(W / 2, M);
      ctx.lineTo(W / 2, H - M);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, H * 0.12, 0, Math.PI * 2);
      ctx.stroke();
      const boxH = H * 0.5;
      const boxW = W * 0.12;
      ctx.strokeRect(M, (H - boxH) / 2, boxW, boxH);
      ctx.strokeRect(W - M - boxW, (H - boxH) / 2, boxW, boxH);

      const i = Math.floor(tFrame);
      const frac = tFrame - i;
      const f0 = data.frames[Math.min(i, data.frames.length - 1)];
      const f1 = data.frames[Math.min(i + 1, data.frames.length - 1)];
      const lerp = (a: number | null, b: number | null) =>
        a === null || b === null ? a ?? b : a + (b - a) * frac;
      const px = (v: number) => M + v * (W - 2 * M);
      const py = (v: number) => M + v * (H - 2 * M);

      const drawEntity = (
        idx: number,
        color: string,
        label: string | null,
        r: number
      ) => {
        const x = lerp(f0[idx], f1[idx]);
        const y = lerp(f0[idx + 1], f1[idx + 1]);
        if (x === null || y === null || Number.isNaN(x) || Number.isNaN(y)) return;
        ctx.beginPath();
        ctx.arc(px(x), py(y), r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = label ? 4 : 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        if (label) {
          ctx.fillStyle = "#0a0f0b";
          ctx.font = "bold 8px Barlow Condensed, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, px(x), py(y));
        }
      };

      let idx = 2;
      for (const num of data.home) {
        drawEntity(idx, "#c6ff00", num, 7);
        idx += 2;
      }
      for (const num of data.away) {
        drawEntity(idx, "#E0703F", num, 7);
        idx += 2;
      }
      drawEntity(0, "#ffffff", null, 4); // ball on top
    },
    [data]
  );

  useEffect(() => {
    if (!data) return;
    let last = 0;
    const step = (now: number) => {
      if (!last) last = now;
      const dt = (now - last) / 1000;
      last = now;
      if (state.current.playing) {
        state.current.t += dt * data.fps * state.current.speed;
        if (state.current.t >= data.frames.length - 1) {
          state.current.t = 0;
        }
        setProgress(state.current.t);
      }
      draw(state.current.t);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [data, draw]);

  const seconds = data ? progress / data.fps : 0;

  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button
          onClick={() => setPlaying((p) => !p)}
          disabled={!data}
          className="rounded-lg bg-volt px-5 py-2 font-display text-lg font-bold uppercase text-pitch-950 transition-transform hover:scale-105 disabled:opacity-50"
        >
          {playing ? "❚❚ Pause" : "▶ Play"}
        </button>
        <div className="flex items-center gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`rounded-md px-3 py-1.5 font-display text-sm font-semibold ${
                speed === s ? "bg-pitch-700 text-volt" : "text-pitch-300 hover:text-pitch-50"
              }`}
            >
              ×{s}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={data ? data.frames.length - 1 : 0}
          value={progress}
          onChange={(e) => {
            state.current.t = Number(e.target.value);
            setProgress(state.current.t);
          }}
          className="min-w-40 flex-1 accent-[#c6ff00]"
          aria-label="Seek tracking time"
        />
        <span className="score-digits w-14 text-right text-lg text-pitch-300">
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:
          {String(Math.floor(seconds % 60)).padStart(2, "0")}
        </span>
      </div>
      <div className="relative turf">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, #c6ff00 0 10%, transparent 10% 20%)",
          }}
        />
        <canvas
          ref={canvasRef}
          width={900}
          height={560}
          className="relative h-auto w-full"
        />
        {!data && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse text-xs uppercase tracking-widest text-pitch-400">
            loading tracking data…
          </span>
        )}
      </div>
    </div>
  );
}
