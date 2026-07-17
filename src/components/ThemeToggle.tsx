"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme");
    if (t === "light" || t === "dark") setTheme(t);
  }, []);

  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("rewindfc_theme", next);
  };

  return (
    <button
      onClick={flip}
      title="Toggle theme"
      className="rounded-lg border border-pitch-700 px-2.5 py-1.5 text-sm transition-colors hover:border-accent"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
