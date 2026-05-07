"use client";

import { formatProbability } from "@/lib/format";

interface OddsBarProps {
  yesProbability: number;
  size?: "sm" | "md";
  showLabels?: boolean;
}

export function OddsBar({
  yesProbability,
  size = "md",
  showLabels = true,
}: OddsBarProps) {
  const yesPct = Math.round(yesProbability * 100);
  const noPct = 100 - yesPct;
  const heightClass = size === "sm" ? "h-2.5" : "h-3";
  const yesDominant = yesPct >= noPct;

  return (
    <div className="w-full">
      <div
        className={`flex w-full overflow-hidden rounded-full bg-stone-100 ${heightClass}`}
        role="img"
        aria-label={`Yes ${yesPct}%, No ${noPct}%`}
      >
        <div
          className="bg-emerald-500 transition-[width] duration-500 ease-out"
          style={{ width: `${yesPct}%` }}
        />
        <div
          className="bg-rose-500 transition-[width] duration-500 ease-out"
          style={{ width: `${noPct}%` }}
        />
      </div>
      {showLabels ? (
        <div className="mt-1 flex justify-between text-xs font-medium">
          <span
            className={
              yesDominant ? "text-emerald-600" : "text-stone-500"
            }
          >
            Yes {formatProbability(yesProbability)}
          </span>
          <span
            className={
              !yesDominant ? "text-rose-600" : "text-stone-500"
            }
          >
            No {formatProbability(1 - yesProbability)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
