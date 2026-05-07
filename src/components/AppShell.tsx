"use client";

import Link from "next/link";
import { useEvent, useMe } from "@/lib/hooks";
import { formatBucks } from "@/lib/format";
import { Beer } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { EventStatusBanner } from "./EventStatusBanner";
import { useMarketRealtime } from "@/lib/useMarketRealtime";

export function AppShell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const event = useEvent();
  const { status: realtimeStatus } = useMarketRealtime();

  return (
    <div className="flex min-h-screen-safe flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-semibold tracking-tight"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-white">
              <Beer className="h-4 w-4" aria-hidden />
            </span>
            <span className="leading-none">
              <span className="block">Beer Mile Bets</span>
              {event.data?.name ? (
                <span className="block text-xs font-normal text-stone-500">
                  {event.data.name}
                </span>
              ) : null}
            </span>
          </Link>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-stone-400">
              Beer Bucks
            </div>
            <div className="font-semibold tabular-nums text-amber-600">
              {me.data ? formatBucks(me.data.beerBucks) : "—"}
            </div>
          </div>
        </div>
        <EventStatusBanner status={event.data?.status} />
        {realtimeStatus === "disconnected" ? (
          <div className="mx-auto max-w-3xl px-4 py-1.5 text-center text-xs font-medium text-stone-500">
            Reconnecting…
          </div>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4">
        {children}
      </main>

      <BottomNav role={me.data?.role} />
    </div>
  );
}
