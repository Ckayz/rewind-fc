"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";

const StadiumHero = dynamic(() => import("./StadiumHero"), {
  ssr: false,
  loading: () => null,
});

/** 3D layer behind the hub hero — skipped entirely for reduced-motion users. */
export function HeroCanvas() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <div className="pointer-events-none absolute inset-0 opacity-70">
      <StadiumHero />
    </div>
  );
}
