"use client";

import type { MarketDetail } from "@/lib/types";
import { formatBucks } from "@/lib/format";

export function TradeHistory({ market }: { market: MarketDetail }) {
  if (market.myTrades.length === 0) return null;

  const totalYes = market.myTrades
    .filter((t) => t.side === "yes")
    .reduce((s, t) => s + t.amount, 0);
  const totalNo = market.myTrades
    .filter((t) => t.side === "no")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <h3 className="text-sm font-semibold tracking-tight">Your bets</h3>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-emerald-50 px-3 py-2">
          <div className="text-stone-600">On Yes</div>
          <div className="font-semibold tabular-nums text-emerald-700">
            {formatBucks(totalYes)} BB
          </div>
        </div>
        <div className="rounded-xl bg-rose-50 px-3 py-2">
          <div className="text-stone-600">On No</div>
          <div className="font-semibold tabular-nums text-rose-700">
            {formatBucks(totalNo)} BB
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-xs">
        {market.myTrades.slice(0, 8).map((t) => (
          <li key={t.id} className="flex items-center justify-between text-stone-500">
            <span>
              <span
                className={`mr-2 inline-block w-9 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide ${
                  t.side === "yes"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {t.side}
              </span>
              {new Date(t.createdAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <span className="font-medium tabular-nums text-stone-700">
              {formatBucks(t.amount)} BB
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
