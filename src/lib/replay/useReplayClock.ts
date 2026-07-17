"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ReplayClock {
  virtualMs: number;
  playing: boolean;
  speed: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (ms: number) => void;
  setSpeed: (s: number) => void;
  done: boolean;
}

/**
 * Virtual match clock. speed = match-ms per real-ms
 * (e.g. 60 → a 90' match replays in ~90 seconds).
 */
export function useReplayClock(
  durationMs: number,
  initialSpeed = 60,
  startAtMs = 0,
  autoPlay = false
): ReplayClock {
  const [virtualMs, setVirtualMs] = useState(startAtMs);
  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(initialSpeed);
  const raf = useRef<number>(0);
  const last = useRef<number>(0);
  const speedRef = useRef(initialSpeed);
  speedRef.current = speed;

  useEffect(() => {
    if (!playing) return;
    const step = (now: number) => {
      if (!last.current) last.current = now;
      const delta = (now - last.current) * speedRef.current;
      last.current = now;
      setVirtualMs((v) => {
        const next = v + delta;
        if (next >= durationMs) {
          setPlaying(false);
          return durationMs;
        }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf.current);
      last.current = 0;
    };
  }, [playing, durationMs]);

  const play = useCallback(() => {
    setVirtualMs((v) => (v >= durationMs ? 0 : v));
    setPlaying(true);
  }, [durationMs]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(
    () => (playing ? pause() : play()),
    [playing, pause, play]
  );
  const seek = useCallback(
    (ms: number) => setVirtualMs(Math.max(0, Math.min(durationMs, ms))),
    [durationMs]
  );

  return {
    virtualMs,
    playing,
    speed,
    play,
    pause,
    toggle,
    seek,
    setSpeed,
    done: virtualMs >= durationMs,
  };
}
