"use client";

import { Trophy } from "lucide-react";
import { useEvent, useLeaderboard } from "@/lib/hooks";
import { Skeleton } from "./ui/Skeleton";
import { formatBucks } from "@/lib/format";

export function LeaderboardView() {
  const lb = useLeaderboard();
  const event = useEvent();
  const isFinal = event.data?.status === "completed";

  if (lb.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (lb.isError || !lb.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Couldn&apos;t load the leaderboard.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
            isFinal ? "bg-emerald-500 text-white" : "bg-amber-400 text-stone-900"
          }`}
        >
          <Trophy className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {isFinal ? "Final Results" : "Leaderboard"}
          </h1>
          <p className="text-sm text-stone-500">
            {isFinal
              ? "All markets resolved. Standings are final."
              : "Live ranking by Beer Bucks balance."}
          </p>
        </div>
      </div>

      {lb.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
          No players yet.
        </div>
      ) : (
        <ol className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
          {lb.data.map((entry, i) => (
            <li
              key={entry.userId}
              className={`flex items-center justify-between px-4 py-3 ${
                i !== lb.data!.length - 1 ? "border-b border-stone-100" : ""
              } ${entry.isMe ? "bg-amber-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                    entry.rank === 1
                      ? "bg-amber-400 text-stone-900"
                      : entry.rank === 2
                      ? "bg-stone-300 text-stone-800"
                      : entry.rank === 3
                      ? "bg-amber-200 text-stone-800"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {entry.rank}
                </span>
                <span
                  className={`text-sm ${
                    entry.isMe ? "font-semibold" : "font-medium"
                  }`}
                >
                  {entry.displayName}
                  {entry.isMe ? (
                    <span className="ml-1 text-[11px] font-normal uppercase tracking-wide text-amber-600">
                      you
                    </span>
                  ) : null}
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums text-amber-600">
                {formatBucks(entry.beerBucks)} BB
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
