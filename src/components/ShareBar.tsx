"use client";

import { useState } from "react";

export function ShareBar({
  title,
  path,
}: {
  title: string;
  path: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = `https://rewind-fc.vercel.app${path}`;
  const text = `${title} — replay it minute by minute with real odds movement on Rewind FC ⏪⚽`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-pitch-400">
        Share
      </span>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg border border-pitch-700 px-3 py-1.5 text-xs font-semibold text-pitch-100 hover:border-volt hover:text-volt"
      >
        𝕏 Post
      </a>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg border border-pitch-700 px-3 py-1.5 text-xs font-semibold text-pitch-100 hover:border-volt hover:text-volt"
      >
        WhatsApp
      </a>
      <button
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          });
        }}
        className="rounded-lg border border-pitch-700 px-3 py-1.5 text-xs font-semibold text-pitch-100 hover:border-volt hover:text-volt"
      >
        {copied ? "✓ Copied" : "Copy link"}
      </button>
    </div>
  );
}
