"use client";

import { estimatedPayout, estimatedProfit } from "@/lib/betting";
import { formatBucks } from "@/lib/format";
import type { Side } from "@/lib/types";

interface EstimatedPayoutProps {
  yesPool: number;
  noPool: number;
  side: Side;
  amount: number;
}

export function EstimatedPayout({
  yesPool,
  noPool,
  side,
  amount,
}: EstimatedPayoutProps) {
  if (amount <= 0) {
    return (
      <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-500">
        Enter an amount to see what you&apos;d win.
      </div>
    );
  }
  const payout = estimatedPayout(yesPool, noPool, side, amount);
  const profit = estimatedProfit(yesPool, noPool, side, amount);
  return (
    <div className="rounded-xl bg-stone-50 px-4 py-3 text-sm">
      <div className="flex justify-between">
        <span className="text-stone-500">If {side === "yes" ? "Yes" : "No"} wins, you get</span>
        <span className="font-semibold tabular-nums">{formatBucks(payout)} BB</span>
      </div>
      <div className="mt-0.5 flex justify-between">
        <span className="text-stone-500">Profit</span>
        <span className="font-semibold tabular-nums text-emerald-600">
          +{formatBucks(profit)} BB
        </span>
      </div>
      <p className="mt-2 text-xs text-stone-400">
        Estimated at current odds. Final payout may differ if more bets come in.
      </p>
    </div>
  );
}
