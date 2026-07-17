"use client";

/** Polymarket-style segmented pill tabs */
export function TabPills<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string; icon?: string }[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="flex justify-center gap-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            active === t.key
              ? "bg-accent/15 text-accent"
              : "text-pitch-400 hover:text-pitch-100"
          }`}
        >
          {t.icon && <span className="text-xs">{t.icon}</span>}
          {t.label}
        </button>
      ))}
    </div>
  );
}
