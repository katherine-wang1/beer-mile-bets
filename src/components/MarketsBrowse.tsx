"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useMarkets, useCategories } from "@/lib/hooks";
import { MarketCard } from "./MarketCard";
import { Skeleton } from "./ui/Skeleton";

export function MarketsBrowse() {
  const markets = useMarkets();
  const categories = useCategories();

  if (markets.isLoading || categories.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (markets.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Couldn&apos;t load markets. Pull to refresh.
      </div>
    );
  }

  const all = markets.data ?? [];
  const cats = categories.data ?? [];

  // Group by category. Only include categories that actually have markets,
  // plus default categories so they're discoverable empty.
  const byCategory = new Map<string, typeof all>();
  for (const m of all) {
    const arr = byCategory.get(m.categoryId) ?? [];
    arr.push(m);
    byCategory.set(m.categoryId, arr);
  }
  // sort each group by total volume desc, then created desc
  for (const arr of byCategory.values()) {
    arr.sort((a, b) =>
      b.totalVolume - a.totalVolume !== 0
        ? b.totalVolume - a.totalVolume
        : b.createdAt.localeCompare(a.createdAt)
    );
  }

  const orderedCats = [...cats].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const totalCount = all.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Markets</h1>
          <p className="text-sm text-stone-500">
            {totalCount} market{totalCount === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/markets/new"
          className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3.5 py-2 text-sm font-semibold text-stone-900 shadow-sm active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" aria-hidden /> New
        </Link>
      </div>

      {totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center">
          <div className="text-2xl">🍻</div>
          <p className="mt-2 text-sm font-medium">No markets yet.</p>
          <p className="text-sm text-stone-500">Be the first to create one.</p>
        </div>
      ) : (
        orderedCats.map((cat) => {
          const items = byCategory.get(cat.id);
          if (!items || items.length === 0) return null;
          return (
            <section key={cat.id}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
                {cat.emoji ? <span aria-hidden>{cat.emoji}</span> : null}
                {cat.name}
              </h2>
              <div className="space-y-3">
                {items.map((m) => (
                  <MarketCard key={m.id} market={m} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
