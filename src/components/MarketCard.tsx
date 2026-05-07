"use client";

import Link from "next/link";
import { Lock, CheckCircle2, XCircle } from "lucide-react";
import type { MarketListItem } from "@/lib/types";
import { OddsBar } from "./OddsBar";
import { VolumeBadge } from "./VolumeBadge";
import { timeUntil } from "@/lib/format";

export function MarketCard({ market }: { market: MarketListItem }) {
  const statusBadge = renderStatus(market);

  return (
    <Link
      href={`/markets/${market.id}`}
      className="block rounded-2xl border border-stone-200 bg-white p-4 transition active:scale-[0.99]"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug tracking-tight text-stone-900">
          {market.question}
        </h3>
        {statusBadge}
      </div>
      <OddsBar yesProbability={market.yesProbability} size="sm" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
        <span className="inline-flex items-center gap-1">
          {market.categoryEmoji ? (
            <span aria-hidden>{market.categoryEmoji}</span>
          ) : null}
          <span className="font-medium text-stone-600">
            {market.categoryName}
          </span>
        </span>
        <VolumeBadge volume={market.totalVolume} />
        <span>
          {market.status === "open" ? timeUntil(market.closingTime) : ""}
        </span>
      </div>
    </Link>
  );
}

function renderStatus(market: MarketListItem) {
  switch (market.status) {
    case "locked":
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
          <Lock className="h-3 w-3" aria-hidden /> Locked
        </span>
      );
    case "resolved":
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 className="h-3 w-3" aria-hidden /> Resolved
        </span>
      );
    case "voided":
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
          <XCircle className="h-3 w-3" aria-hidden /> Voided
        </span>
      );
    default:
      return null;
  }
}
