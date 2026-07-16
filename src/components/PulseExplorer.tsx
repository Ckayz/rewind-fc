"use client";

import { useCallback, useEffect, useState } from "react";
import { flag } from "@/lib/flags";

interface PulseFixture {
  fixtureId: string;
  p1?: string;
  p2?: string;
  score?: { p1: number; p2: number };
  events: { action: string; minute: number | null; seq?: number }[];
}

interface PulseData {
  ok: boolean;
  error?: string;
  totalRecords: number;
  fixtures: PulseFixture[];
}

const ICON: Record<string, string> = {
  kickoff: "⏱", goal: "⚽", shot: "🎯", corner: "🚩", var: "📺",
  var_end: "📺", penalty: "⭕", substitution: "🔁", yellow_card: "🟨",
  red_card: "🟥", game_finalised: "🏁",
};

/** notable moments to jump to (UTC) */
const PRESETS = [
  { label: "SF: France v Spain — kickoff", iso: "2026-07-14T19:00:00Z" },
  { label: "SF: France v Spain — closing stages", iso: "2026-07-14T20:35:00Z" },
  { label: "SF: England v Argentina — kickoff", iso: "2026-07-15T21:00:00Z" },
  { label: "SF: England v Argentina — late drama", iso: "2026-07-15T22:40:00Z" },
  { label: "Bronze: France v England — live", iso: "2026-07-18T21:10:00Z" },
  { label: "Final: Spain v Argentina — live", iso: "2026-07-19T19:10:00Z" },
];

function windowOf(iso: string) {
  const ms = Date.parse(iso);
  return {
    epochDay: Math.floor(ms / 86_400_000),
    hour: Math.floor((ms % 86_400_000) / 3_600_000),
    interval: Math.floor((ms % 3_600_000) / (5 * 60_000)),
  };
}

export function PulseExplorer() {
  const [iso, setIso] = useState(PRESETS[1].iso);
  const [data, setData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (isoTs: string) => {
    setLoading(true);
    const w = windowOf(isoTs);
    try {
      const res = await fetch(
        `/api/pulse?epochDay=${w.epochDay}&hour=${w.hour}&interval=${w.interval}`
      );
      setData(await res.json());
    } catch (e) {
      setData({ ok: false, error: String(e), totalRecords: 0, fixtures: [] });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(iso);
  }, [iso, load]);

  const shift = (deltaMin: number) => {
    const next = new Date(Date.parse(iso) + deltaMin * 60_000).toISOString();
    setIso(next);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="glass flex flex-wrap items-center gap-3 rounded-xl px-4 py-3">
        <select
          value={iso}
          onChange={(e) => setIso(e.target.value)}
          className="glass rounded-lg px-3 py-2 text-sm text-pitch-50 outline-none"
        >
          {PRESETS.map((p) => (
            <option key={p.iso} value={p.iso} className="bg-pitch-900">
              {p.label}
            </option>
          ))}
          {!PRESETS.some((p) => p.iso === iso) && (
            <option value={iso} className="bg-pitch-900">
              custom — {iso.slice(0, 16).replace("T", " ")} UTC
            </option>
          )}
        </select>
        <div className="flex items-center gap-1">
          <button
            onClick={() => shift(-5)}
            className="rounded-md border border-pitch-700 px-2.5 py-1.5 font-display text-sm text-pitch-100 hover:border-volt"
          >
            −5 min
          </button>
          <button
            onClick={() => shift(5)}
            className="rounded-md border border-pitch-700 px-2.5 py-1.5 font-display text-sm text-pitch-100 hover:border-volt"
          >
            +5 min
          </button>
        </div>
        <span className="score-digits ml-auto text-lg text-volt">
          {iso.slice(11, 16)} UTC
        </span>
        <span className="text-xs text-pitch-400">
          {iso.slice(0, 10)} · 5-minute slice
        </span>
      </div>

      {loading && (
        <p className="animate-pulse py-6 text-center text-sm text-pitch-400">
          Reading the tournament&apos;s heartbeat…
        </p>
      )}

      {!loading && data?.ok && data.fixtures.length === 0 && (
        <p className="glass rounded-xl py-10 text-center text-sm text-pitch-400">
          Silence — no recorded events in this slice. Jump to a preset moment.
        </p>
      )}

      {!loading && data?.ok && data.fixtures.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.fixtures.map((f) => (
            <div key={f.fixtureId} className="glass rounded-xl p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-lg font-semibold uppercase">
                  {f.p1 ? (
                    <>
                      {flag(f.p1)} {f.p1}
                      <span className="score-digits px-2 text-volt">
                        {f.score ? `${f.score.p1}–${f.score.p2}` : "v"}
                      </span>
                      {f.p2} {flag(f.p2!)}
                    </>
                  ) : (
                    `Fixture ${f.fixtureId}`
                  )}
                </span>
              </div>
              {f.events.length === 0 ? (
                <p className="text-xs text-pitch-400">
                  in play — no key events this slice
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {f.events.slice(0, 8).map((e, i) => (
                    <li key={`${e.seq}-${i}`} className="flex items-center gap-2">
                      <span className="score-digits w-8 text-right text-pitch-300">
                        {e.minute != null ? `${e.minute}'` : ""}
                      </span>
                      <span>{ICON[e.action] ?? "•"}</span>
                      <span className="capitalize text-pitch-100">
                        {e.action.replace(/_/g, " ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && data && !data.ok && (
        <p className="glass rounded-xl py-8 text-center text-sm text-live">
          {data.error}
        </p>
      )}
    </div>
  );
}
