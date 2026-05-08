"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useMarkets } from "@/lib/hooks";
import { MarketCard } from "./MarketCard";
import { HowItWorks } from "./HowItWorks";
import { Skeleton } from "./ui/Skeleton";

export function HomeFeed() {
  const markets = useMarkets();

  const open = (markets.data ?? []).filter((m) => m.status === "open");
  const otherStatuses = (markets.data ?? []).filter((m) => m.status !== "open");

  // Sort open markets by recent activity (volume desc, then created desc).
  const openSorted = [...open].sort((a, b) =>
    b.totalVolume - a.totalVolume !== 0
      ? b.totalVolume - a.totalVolume
      : b.createdAt.localeCompare(a.createdAt)
  );
  const otherSorted = [...otherStatuses].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  if (markets.isLoading) {
    return (
      <div className="space-y-5">
        <HowItWorks />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (markets.isError) {
    return (
      <div className="space-y-5">
        <HowItWorks />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Couldn&apos;t load markets.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <HowItWorks />
      <div
        id="live-markets-feed"
        className="flex items-center justify-between scroll-mt-4"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight">Live markets</h1>
          <p className="text-sm text-stone-500">
            {openSorted.length} open
            {otherSorted.length > 0 ? ` · ${otherSorted.length} closed` : ""}
          </p>
        </div>
        <Link
          href="/markets/new"
          className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3.5 py-2 text-sm font-semibold text-stone-900 shadow-sm active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" aria-hidden /> New
        </Link>
      </div>

      {openSorted.length === 0 && otherSorted.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {openSorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
              No open markets. Be the first to{" "}
              <Link href="/markets/new" className="font-medium text-amber-600">
                create one
              </Link>
              .
            </div>
          ) : (
            <div className="space-y-3">
              {openSorted.map((m) => (
                <MarketCard key={m.id} market={m} />
              ))}
            </div>
          )}

          {otherSorted.length > 0 ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
                Closed
              </h2>
              <div className="space-y-3">
                {otherSorted.slice(0, 10).map((m) => (
                  <MarketCard key={m.id} market={m} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center">
      <div className="text-3xl">🍻</div>
      <p className="mt-3 text-base font-semibold">Welcome to Beer Mile Bets!</p>
      <p className="mt-1 text-sm text-stone-500">
        No markets yet. Create the first one and start the action.
      </p>
      <Link
        href="/markets/new"
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-stone-900"
      >
        Create a market
      </Link>
    </div>
  );
}
