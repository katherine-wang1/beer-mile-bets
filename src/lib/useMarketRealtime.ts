"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "./supabase-browser";
import { yesProbability } from "./betting";
import type { MarketDetail, MarketListItem, MarketStatus, Side } from "./types";

type ConnectionStatus = "connected" | "connecting" | "disconnected";

/**
 * Subscribes to all UPDATE/INSERT events on the `markets` table and
 * updates React Query caches in place so any view rendering market data
 * re-renders automatically. Safe to call from multiple components — the
 * Supabase client is a singleton, but we deduplicate by channel name.
 */
export function useMarketRealtime(): { status: ConnectionStatus } {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase.channel("markets-feed");

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "markets" },
      (payload) => {
        const next = payload.new as {
          id: string;
          status: MarketStatus;
          yes_pool: number;
          no_pool: number;
          resolved_outcome: Side | null;
          resolution_note: string | null;
          resolved_at: string | null;
        };
        applyMarketUpdate(qc, next);
      }
    );

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "markets" },
      () => {
        // A new market was created somewhere — refetch the list.
        qc.invalidateQueries({ queryKey: ["markets"] });
      }
    );

    channel.subscribe((s) => {
      if (s === "SUBSCRIBED") setStatus("connected");
      else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED")
        setStatus("disconnected");
      else setStatus("connecting");
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return { status };
}

function applyMarketUpdate(
  qc: ReturnType<typeof useQueryClient>,
  next: {
    id: string;
    status: MarketStatus;
    yes_pool: number;
    no_pool: number;
    resolved_outcome: Side | null;
    resolution_note: string | null;
    resolved_at: string | null;
  }
) {
  const yesP = yesProbability(next.yes_pool, next.no_pool);

  // Patch every market list cache.
  qc.setQueriesData<MarketListItem[]>({ queryKey: ["markets"] }, (prev) => {
    if (!prev) return prev;
    return prev.map((m) =>
      m.id === next.id
        ? {
            ...m,
            status: next.status,
            yesPool: next.yes_pool,
            noPool: next.no_pool,
            yesProbability: yesP,
            totalVolume: next.yes_pool + next.no_pool,
          }
        : m
    );
  });

  // Patch the per-market detail cache if loaded.
  qc.setQueryData<MarketDetail | undefined>(["market", next.id], (prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      status: next.status,
      yesPool: next.yes_pool,
      noPool: next.no_pool,
      yesProbability: yesP,
      totalVolume: next.yes_pool + next.no_pool,
      resolvedOutcome: next.resolved_outcome,
      resolutionNote: next.resolution_note,
      resolvedAt: next.resolved_at,
    };
  });

  // Resolution affects user balance + leaderboard; refetch those lazily.
  if (next.status === "resolved" || next.status === "voided") {
    qc.invalidateQueries({ queryKey: ["me"] });
    qc.invalidateQueries({ queryKey: ["leaderboard"] });
  }
}
