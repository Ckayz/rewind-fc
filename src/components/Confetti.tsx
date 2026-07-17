"use client";

import { motion } from "motion/react";

const COLORS = ["#c6ff00", "#ffc940", "#e8f0e6", "#14f195"];
const h01 = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** dependency-free confetti burst — mount to fire once */
export function Confetti({ pieces = 34 }: { pieces?: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[95] overflow-hidden">
      {Array.from({ length: pieces }, (_, i) => {
        const x = h01(i * 7.3) * 100;
        const delay = h01(i * 3.1) * 0.4;
        const rot = h01(i * 5.7) * 720 - 360;
        return (
          <motion.span
            key={i}
            initial={{ x: `${x}vw`, y: "-4vh", rotate: 0, opacity: 1 }}
            animate={{ y: "108vh", rotate: rot, opacity: [1, 1, 0.7] }}
            transition={{ duration: 2.4 + h01(i) * 1.4, delay, ease: "easeIn" }}
            className="absolute block h-3 w-2 rounded-[2px]"
            style={{ background: COLORS[i % COLORS.length] }}
          />
        );
      })}
    </div>
  );
}
