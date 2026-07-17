"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  Legend,
} from "recharts";

/** Validated categorical trio for dark surfaces (OKLCH band + CVD checked). */
export const ODDS_COLORS = {
  home: "#6E9900",
  draw: "#4795D9",
  away: "#E0703F",
} as const;

export interface OddsPoint {
  tMin: number; // match minute
  home?: number;
  draw?: number;
  away?: number;
  goal?: string; // label when a goal happened at this minute
}

/** Decimal odds above this are market-resolution noise — clamp for readability. */
const ODDS_CAP = 15;
const clamp = (v?: number) => (v === undefined ? undefined : Math.min(v, ODDS_CAP));

export function OddsChart({
  data,
  homeName,
  awayName,
  cursorMin,
}: {
  data: OddsPoint[];
  homeName: string;
  awayName: string;
  cursorMin?: number; // replay cursor — only show points up to this minute
}) {
  const visible = (
    cursorMin === undefined ? data : data.filter((d) => d.tMin <= cursorMin)
  ).map((d) => ({
    ...d,
    home: clamp(d.home),
    draw: clamp(d.draw),
    away: clamp(d.away),
  }));
  const goals = visible.filter((d) => d.goal);

  return (
    <div className="glass rounded-xl p-4">
      <h3 className="mb-1 flex items-baseline justify-between font-display text-lg font-semibold uppercase tracking-widest text-pitch-300">
        Odds movement — StablePrice
        <span className="text-[10px] normal-case tracking-normal text-pitch-500">
          display capped at {ODDS_CAP}.00
        </span>
      </h3>
      <p className="mb-2 text-[10px] text-pitch-500">
        TxODDS consensus of sharp bookmakers, de-margined & outlier-filtered,
        every tick Merkle-anchored on Solana via TxLINE.
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={visible}
            margin={{ top: 8, right: 12, bottom: 0, left: -18 }}
          >
            <CartesianGrid stroke="#1e2a20" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="tMin"
              type="number"
              domain={[0, "dataMax"]}
              tick={{ fill: "#7a8a7c", fontSize: 11 }}
              tickFormatter={(v) => `${v}'`}
              stroke="#2c3d2f"
            />
            <YAxis
              tick={{ fill: "#7a8a7c", fontSize: 11 }}
              stroke="#2c3d2f"
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                background: "#0e1510",
                border: "1px solid #2c3d2f",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#cdd8cc" }}
              labelFormatter={(v) => `Minute ${v}`}
              formatter={(value, name) => [
                typeof value === "number" ? value.toFixed(2) : String(value ?? ""),
                name,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#cdd8cc" }}
              iconType="plainline"
            />
            <Line
              type="stepAfter"
              dataKey="home"
              name={homeName}
              stroke={ODDS_COLORS.home}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="stepAfter"
              dataKey="draw"
              name="Draw"
              stroke={ODDS_COLORS.draw}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="stepAfter"
              dataKey="away"
              name={awayName}
              stroke={ODDS_COLORS.away}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            {goals.map((g) => (
              <ReferenceDot
                key={g.tMin}
                x={g.tMin}
                y={Math.min(g.home ?? 99, g.draw ?? 99, g.away ?? 99)}
                r={5}
                fill="#c6ff00"
                stroke="#0a0f0b"
                strokeWidth={2}
                label={{
                  value: "⚽",
                  position: "top",
                  fontSize: 12,
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
