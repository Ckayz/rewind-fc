import { PulseExplorer } from "@/components/PulseExplorer";

export const metadata = { title: "Matchday Pulse — Rewind FC" };

export default function PulsePage() {
  return (
    <div className="flex flex-col gap-6 pt-10 pb-10">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
          Matchday pulse
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-pitch-300">
          The whole tournament, five minutes at a time — every event across
          every match in any slice.
        </p>
      </div>
      <PulseExplorer />
    </div>
  );
}
