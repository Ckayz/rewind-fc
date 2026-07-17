"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const ITEMS = [
  { href: "/demo", label: "Live demo", icon: "🔴" },
  { href: "/final", label: "Final Showdown", icon: "🏆" },
  { href: "/bracket", label: "Bracket", icon: "🗂" },
  { href: "/leaderboard", label: "Leaderboard", icon: "🥇" },
  { href: "/pulse", label: "Matchday Pulse", icon: "🫀" },
  { href: "/lab", label: "Tracking Lab", icon: "🧪" },
  { href: "/proofs", label: "Proof Room", icon: "⛓" },
  { href: "/about", label: "About", icon: "ℹ️" },
];

export function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm font-semibold text-pitch-300 hover:text-accent"
      >
        More <span className="text-[10px]">▾</span>
      </button>
      {open && (
        <div className="glass absolute right-0 top-8 z-[60] w-52 rounded-xl p-1.5">
          {ITEMS.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-pitch-100 hover:bg-accent/10 hover:text-accent"
            >
              <span className="text-xs">{i.icon}</span>
              {i.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
