"use client";

/** WebAudio-synthesized stadium sounds — no assets, respects a local toggle. */

const KEY = "rewindfc_sound";

export const soundEnabled = () =>
  typeof window !== "undefined" && localStorage.getItem(KEY) === "1";

export const setSoundEnabled = (on: boolean) =>
  localStorage.setItem(KEY, on ? "1" : "0");

let ctx: AudioContext | null = null;
const audio = () => (ctx ??= new AudioContext());

/** two-tone air-horn swell + crowd noise burst */
export function goalHorn() {
  if (!soundEnabled()) return;
  try {
    const ac = audio();
    const now = ac.currentTime;

    for (const [freq, delay] of [
      [233, 0],
      [311, 0.18],
    ] as const) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.18, now + delay + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.1);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 1.2);
    }

    // crowd roar: filtered noise
    const len = ac.sampleRate * 1.6;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const ch = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) {
      // brown-ish noise, deterministic-ish is unnecessary here (pure audio)
      v = (v + (Math.random() * 2 - 1) * 0.04) * 0.985;
      ch[i] = v * 6;
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.32, now + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.6;
    src.connect(filter).connect(g).connect(ac.destination);
    src.start(now);
  } catch {
    /* audio blocked — ignore */
  }
}
