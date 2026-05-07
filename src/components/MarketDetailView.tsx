"use client";

import Link from "next/link";
import { ArrowLeft, Lock, CheckCircle2, XCircle } from "lucide-react";
import { useMarket, useMe } from "@/lib/hooks";
import { OddsBar } from "./OddsBar";
import { BetForm } from "./BetForm";
import { TradeHistory } from "./TradeHistory";
import { Skeleton } from "./ui/Skeleton";
import { formatBucks, timeUntil } from "@/lib/format";

export function MarketDetailView({ id }: { id: string }) {
  const market = useMarket(id);
  const me = useMe();

  if (market.isLoading || me.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (market.isError || !market.data || !me.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Couldn&apos;t load this market.
      </div>
    );
  }

  const m = market.data;
  const winningSide = m.resolvedOutcome;

  return (
    <div className="space-y-4">
      <Link
        href="/markets"
        className="inline-flex items-center gap-1 text-sm text-stone-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Markets
      </Link>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            {m.categoryEmoji ? <span aria-hidden>{m.categoryEmoji}</span> : null}
            <span className="font-medium uppercase tracking-wide">
              {m.categoryName}
            </span>
          </div>
          <StatusPill status={m.status} />
        </div>

        <h1 className="text-xl font-bold leading-snug tracking-tight">
          {m.question}
        </h1>

        <div className="mt-4">
          <OddsBar yesProbability={m.yesProbability} />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
          <span>{formatBucks(m.totalVolume)} BB wagered</span>
          {m.status === "open" ? <span>{timeUntil(m.closingTime)}</span> : null}
          <span>by {m.createdByDisplayName}</span>
        </div>
      </div>

      {m.status === "resolved" && winningSide ? (
        <div
          className={`rounded-2xl border p-4 ${
            winningSide === "yes"
              ? "border-emerald-200 bg-emerald-50"
              : "border-rose-200 bg-rose-50"
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wide">
            {winningSide === "yes"
              ? "Resolved Yes"
              : winningSide === "no"
              ? "Resolved No"
              : ""}
          </div>
          {m.resolutionNote ? (
            <p className="mt-1 text-sm">{m.resolutionNote}</p>
          ) : null}
        </div>
      ) : null}

      {m.status === "voided" ? (
        <div className="rounded-2xl border border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
          Market voided. All bets refunded.
        </div>
      ) : null}

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold tracking-tight">
          Resolution criteria
        </h2>
        <p className="mt-1 text-sm text-stone-700">{m.resolutionCriteria}</p>
      </div>

      <BetForm market={m} me={me.data} />
      <TradeHistory market={m} />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  switch (status) {
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
    case "open":
      return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          Open
        </span>
      );
    default:
      return null;
  }
}
