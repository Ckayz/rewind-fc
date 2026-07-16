import Link from "next/link";
import { type Stage } from "@/data/sample-fixtures";
import { listFixtures, type Fixture } from "@/lib/data";
import { flag } from "@/lib/flags";

export const metadata = { title: "Bracket — Rewind FC" };
export const revalidate = 60;

const COLUMNS: { stage: Stage; title: string }[] = [
  { stage: "r32", title: "Round of 32" },
  { stage: "r16", title: "Round of 16" },
  { stage: "qf", title: "Quarterfinals" },
  { stage: "sf", title: "Semifinals" },
  { stage: "final", title: "Final" },
];

function BracketNode({ f }: { f: Fixture }) {
  const finished = f.status === "finished";
  const p1Wins =
    finished && f.score
      ? f.score.p1 > f.score.p2 ||
        (f.score.note?.startsWith(f.p1) ?? false)
      : false;
  const p2Wins =
    finished && f.score
      ? f.score.p2 > f.score.p1 ||
        (f.score.note?.startsWith(f.p2) ?? false)
      : false;

  return (
    <Link
      href={`/match/${f.fixtureId}`}
      className="glass block w-44 shrink-0 rounded-lg px-3 py-2 transition-colors hover:border-volt/40"
    >
      {(
        [
          [f.p1, f.score?.p1, p1Wins],
          [f.p2, f.score?.p2, p2Wins],
        ] as const
      ).map(([name, score, wins], i) => (
        <div
          key={i}
          className={`flex items-center justify-between py-0.5 font-display text-base font-semibold uppercase ${
            finished && !wins ? "text-pitch-400" : "text-pitch-50"
          }`}
        >
          <span className="truncate">
            <span className="mr-1">{flag(name)}</span>
            {name}
          </span>
          <span className={`score-digits pl-2 ${wins ? "text-volt" : ""}`}>
            {finished ? (score ?? "–") : ""}
          </span>
        </div>
      ))}
      {f.score?.note && (
        <div className="mt-0.5 truncate text-[10px] text-pitch-400">
          {f.score.note}
        </div>
      )}
    </Link>
  );
}

export default async function BracketPage() {
  const all = await listFixtures();
  return (
    <div className="flex flex-col gap-8 pt-10">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
          Knockout bracket
        </h1>
        <p className="mt-1 text-sm text-pitch-300">
          48 teams · 12 groups · Road to MetLife, July 19
        </p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max items-stretch gap-8">
          {COLUMNS.map(({ stage, title }) => {
            const fixtures = all.filter((f) => f.stage === stage);
            const bronze =
              stage === "final"
                ? all.find((f) => f.stage === "bronze")
                : undefined;
            return (
              <div key={stage} className="flex flex-col">
                <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-pitch-300">
                  {title}
                </h2>
                <div className="flex flex-1 flex-col justify-around gap-4">
                  {fixtures.map((f) => (
                    <BracketNode key={f.fixtureId} f={f} />
                  ))}
                  {bronze && (
                    <div className="mt-6">
                      <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.2em] text-pitch-400">
                        Third place
                      </h3>
                      <BracketNode f={bronze} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-pitch-400">
        Bracket populates from TxLINE fixture data — earlier rounds land as the
        full tournament dataset is ingested.
      </p>
    </div>
  );
}
