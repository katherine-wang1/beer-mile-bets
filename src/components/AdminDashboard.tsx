"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";
import { Lock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEvent, useMe } from "@/lib/hooks";
import { Skeleton } from "./ui/Skeleton";
import { formatBucks } from "@/lib/format";
import type { EventStatus } from "@/lib/types";

interface AdminStats {
  openMarkets: number;
  lockedMarkets: number;
  resolvedMarkets: number;
  voidedMarkets: number;
  totalVolume: number;
  totalUsers: number;
}

const STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  active: "Race is live",
  completed: "Completed",
};

export function AdminDashboard() {
  const me = useMe();
  const event = useEvent();
  const qc = useQueryClient();
  const [confirmLock, setConfirmLock] = useState(false);

  const stats = useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
  });

  const eventStatusMutation = useMutation({
    mutationFn: async (status: EventStatus) => {
      const res = await fetch("/api/event", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update event");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Event status updated");
      qc.invalidateQueries({ queryKey: ["event"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const lockAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/lock-all-markets", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to lock all");
      }
      return res.json() as Promise<{ lockedCount: number }>;
    },
    onSuccess: (result) => {
      toast.success(`Locked ${result.lockedCount} markets`);
      qc.invalidateQueries({ queryKey: ["markets"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      setConfirmLock(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (me.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (me.data?.role !== "admin") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Admin only.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold tracking-tight">Admin</h1>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Event status
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["upcoming", "active", "completed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={eventStatusMutation.isPending}
              onClick={() => eventStatusMutation.mutate(s)}
              className={`rounded-xl px-3 py-3 text-sm font-medium transition ${
                event.data?.status === s
                  ? "bg-amber-400 text-stone-900 shadow-sm"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Markets
        </h2>
        {stats.isLoading ? (
          <Skeleton className="mt-2 h-24 w-full" />
        ) : stats.data ? (
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Stat label="Open" value={stats.data.openMarkets} />
            <Stat label="Locked" value={stats.data.lockedMarkets} />
            <Stat label="Resolved" value={stats.data.resolvedMarkets} />
            <Stat label="Voided" value={stats.data.voidedMarkets} />
            <Stat
              label="Volume"
              value={`${formatBucks(stats.data.totalVolume)} BB`}
            />
            <Stat label="Users" value={stats.data.totalUsers} />
          </dl>
        ) : null}
        <div className="mt-4">
          <Link
            href="/admin/markets"
            className="inline-block rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Manage all markets →
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Race-day controls
        </h2>
        <p className="mt-1 text-xs text-stone-500">
          Use this when the race starts. It locks every open market in one tap.
        </p>
        {confirmLock ? (
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              disabled={lockAllMutation.isPending}
              onClick={() => lockAllMutation.mutate()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              <Lock className="h-4 w-4" aria-hidden /> Confirm — lock all open
              markets
            </button>
            <button
              type="button"
              onClick={() => setConfirmLock(false)}
              className="text-xs text-stone-500"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmLock(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Lock className="h-4 w-4" aria-hidden /> Lock all open markets
          </button>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
