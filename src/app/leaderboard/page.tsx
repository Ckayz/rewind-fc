import { sql as dsql, desc, eq, sum, count } from "drizzle-orm";
import { db } from "@/db";
import { picks, users } from "@/db/schema";
import { settleOpenPicks } from "@/lib/picks";

export const metadata = { title: "Leaderboard — Rewind FC" };
export const revalidate = 30;

export default async function LeaderboardPage() {
  await settleOpenPicks();

  const rows = await db
    .select({
      wallet: picks.wallet,
      displayName: users.displayName,
      points: sum(picks.points).mapWith(Number),
      wins: count(dsql`case when ${picks.status} = 'won' then 1 end`),
      total: count(picks.id),
    })
    .from(picks)
    .leftJoin(users, eq(users.wallet, picks.wallet))
    .groupBy(picks.wallet, users.displayName)
    .orderBy(desc(sum(picks.points)));

  return (
    <div className="flex flex-col gap-6 pt-10">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
          Leaderboard
        </h1>
        <p className="mt-1 text-sm text-pitch-300">
          Every pick is signed by its wallet — tamper-evident by design.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center text-pitch-300">
          No picks yet. Open a{" "}
          <span className="text-volt">Time Machine replay</span> and make the
          first prediction.
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-pitch-700/40 text-xs font-semibold uppercase tracking-widest text-pitch-400">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3 text-right">W/L</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.wallet}
                  className="border-b border-pitch-700/20 last:border-0"
                >
                  <td className="score-digits px-4 py-3 text-lg text-pitch-300">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {r.displayName ??
                      `${r.wallet.slice(0, 4)}…${r.wallet.slice(-4)}`}
                    {i === 0 && <span className="ml-2">👑</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-pitch-300">
                    {r.wins}/{r.total}
                  </td>
                  <td className="score-digits px-4 py-3 text-right text-xl text-volt">
                    {r.points ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
