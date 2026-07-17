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
          Real optical tracking — every player and the ball, from a pro match
          (Metrica open data).
        </p>
        <details className="mt-1 max-w-2xl text-xs text-pitch-400">
          <summary className="cursor-pointer font-semibold hover:text-accent">
            ⓘ Why not WC 2026 tracking?
          </summary>
          <p className="mt-1">
            FIFA licenses tournament tracking exclusively, so match pages use
            the zone radar from TxLINE data. This engine renders full
            coordinates the day a feed is plugged in.
          </p>
        </details>
      </div>
      <TrackingLab />
      <p className="text-xs text-pitch-500">
        Data: Metrica Sports sample-data (github.com/metrica-sports/sample-data),
        first six minutes, downsampled to 5 fps and interpolated client-side.
      </p>
    </div>
  );
}
