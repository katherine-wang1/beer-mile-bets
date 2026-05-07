"use client";

import { formatBucks } from "@/lib/format";

export function VolumeBadge({ volume }: { volume: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-stone-500 tabular-nums">
      <span className="font-medium text-stone-700">{formatBucks(volume)}</span>
      <span>BB wagered</span>
    </span>
  );
}
