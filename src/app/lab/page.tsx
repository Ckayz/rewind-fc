import { TrackingLab } from "@/components/TrackingLab";

export const metadata = { title: "Tracking Lab — Rewind FC" };

export default function LabPage() {
  return (
    <div className="flex flex-col gap-6 pt-10 pb-10">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
          Tracking lab
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-pitch-300">
          This is <span className="text-volt">real optical tracking</span> —
          every player and the ball, 25 times a second, from a professional
          match (Metrica Sports open data, anonymized). It&apos;s what Rewind
          FC renders the moment a club or league plugs a tracking feed into the
          engine. World Cup 2026 tracking is licensed exclusively by FIFA, so
          match pages use the honest zone radar from TxLINE data — the pipeline
          below is ready for the day the coordinates flow.
        </p>
      </div>
      <TrackingLab />
      <p className="text-xs text-pitch-500">
        Data: Metrica Sports sample-data (github.com/metrica-sports/sample-data),
        first six minutes, downsampled to 5 fps and interpolated client-side.
      </p>
    </div>
  );
}
