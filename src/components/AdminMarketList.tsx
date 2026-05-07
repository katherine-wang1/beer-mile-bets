"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMarkets } from "@/lib/hooks";
import { Skeleton } from "./ui/Skeleton";
import { OddsBar } from "./OddsBar";
import { formatBucks } from "@/lib/format";
import type { MarketStatus } from "@/lib/types";

const FILTERS: ReadonlyArray<{ key: "all" | MarketStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "locked", label: "Locked" },
  { key: "resolved", label: "Resolved" },
  { key: "voided", label: "Voided" },
];

export function AdminMarketList() {
  const [filter, setFilter] = useState<"all" | MarketStatus>("all");
  const markets = useMarkets();

  const filtered = (markets.data ?? []).filter(
    (m) => filter === "all" || m.status === filter
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-stone-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Admin
        </Link>
      </div>

      <h1 className="text-xl font-bold tracking-tight">All markets</h1>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f.key
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {markets.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          No markets here.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((m) => (
            <li key={m.id}>
              <Link
                href={`/admin/markets/${m.id}`}
                className="block rounded-2xl border border-stone-200 bg-white p-4 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold leading-snug">
                    {m.question}
                  </h3>
                  <StatusTag status={m.status} />
                </div>
                <div className="mt-3">
                  <OddsBar yesProbability={m.yesProbability} size="sm" showLabels={false} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-stone-500">
                  <span>by {m.createdByDisplayName}</span>
                  <span>{formatBucks(m.totalVolume)} BB</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusTag({ status }: { status: MarketStatus }) {
  const cls: Record<MarketStatus, string> = {
    open: "bg-emerald-50 text-emerald-700",
    locked: "bg-stone-100 text-stone-600",
    resolved: "bg-amber-50 text-amber-700",
    voided: "bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls[status]}`}
    >
      {status}
    </span>
  );
}
