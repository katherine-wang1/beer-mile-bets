"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Lock, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMarket } from "@/lib/hooks";
import { Skeleton } from "./ui/Skeleton";
import { OddsBar } from "./OddsBar";
import { ResolveModal } from "./ResolveModal";
import { formatBucks, timeUntil } from "@/lib/format";
import type { Side } from "@/lib/types";

interface AdminTrade {
  id: string;
  side: Side;
  amount: number;
  createdAt: string;
  userId: string | null;
  displayName: string;
}

export function AdminMarketDetail({ id }: { id: string }) {
  const market = useMarket(id);
  const qc = useQueryClient();
  const [resolveSide, setResolveSide] = useState<Side | null>(null);
  const [confirmVoid, setConfirmVoid] = useState(false);

  const trades = useQuery<AdminTrade[]>({
    queryKey: ["admin", "trades", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/markets/${id}/trades`);
      if (!res.ok) throw new Error("Failed to load trades");
      return res.json();
    },
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/markets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to lock");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Market locked");
      qc.invalidateQueries({ queryKey: ["market", id] });
      qc.invalidateQueries({ queryKey: ["markets"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ outcome, note }: { outcome: Side; note: string }) => {
      const res = await fetch(`/api/markets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", outcome, note }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to resolve");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Market resolved · payouts distributed");
      qc.invalidateQueries({ queryKey: ["market", id] });
      qc.invalidateQueries({ queryKey: ["markets"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      setResolveSide(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const voidMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/markets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to void");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Market voided · refunds issued");
      qc.invalidateQueries({ queryKey: ["market", id] });
      qc.invalidateQueries({ queryKey: ["markets"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      setConfirmVoid(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (market.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!market.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Market not found.
      </div>
    );
  }
  const m = market.data;
  const canLock = m.status === "open";
  const canResolveOrVoid = m.status === "open" || m.status === "locked";

  return (
    <div className="space-y-4">
      <Link
        href="/admin/markets"
        className="inline-flex items-center gap-1 text-sm text-stone-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> All markets
      </Link>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="text-xs text-stone-500">
          {m.categoryEmoji ? `${m.categoryEmoji} ` : ""}
          {m.categoryName} · by {m.createdByDisplayName}
        </div>
        <h1 className="mt-1 text-lg font-bold leading-snug tracking-tight">
          {m.question}
        </h1>
        <div className="mt-3">
          <OddsBar yesProbability={m.yesProbability} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
          <span>
            Yes pool:{" "}
            <span className="font-semibold tabular-nums text-stone-700">
              {formatBucks(m.yesPool)}
            </span>
          </span>
          <span>
            No pool:{" "}
            <span className="font-semibold tabular-nums text-stone-700">
              {formatBucks(m.noPool)}
            </span>
          </span>
          {m.status === "open" ? <span>{timeUntil(m.closingTime)}</span> : null}
          <span className="uppercase">{m.status}</span>
        </div>
        {m.resolutionNote ? (
          <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm text-stone-700">
            <span className="font-semibold">Resolution note: </span>
            {m.resolutionNote}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold tracking-tight">
          Resolution criteria
        </h2>
        <p className="mt-1 text-sm text-stone-700">{m.resolutionCriteria}</p>
      </div>

      {canResolveOrVoid && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Actions
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={resolveMutation.isPending}
              onClick={() => setResolveSide("yes")}
              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Resolve Yes
            </button>
            <button
              type="button"
              disabled={resolveMutation.isPending}
              onClick={() => setResolveSide("no")}
              className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Resolve No
            </button>
            {canLock ? (
              <button
                type="button"
                disabled={lockMutation.isPending}
                onClick={() => lockMutation.mutate()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white"
              >
                <Lock className="h-4 w-4" aria-hidden /> Lock
              </button>
            ) : null}
            <button
              type="button"
              disabled={voidMutation.isPending}
              onClick={() => setConfirmVoid(true)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 ${
                canLock ? "" : "col-span-2"
              }`}
            >
              <XCircle className="h-4 w-4" aria-hidden /> Void
            </button>
          </div>
          {confirmVoid ? (
            <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm">
              <p className="text-rose-700">
                Voiding refunds every bet on this market. Continue?
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => voidMutation.mutate()}
                  disabled={voidMutation.isPending}
                  className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white"
                >
                  Yes, void
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmVoid(false)}
                  className="rounded-lg bg-stone-100 px-3 py-2 text-xs font-medium text-stone-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold tracking-tight">All bets</h2>
        {trades.isLoading ? (
          <Skeleton className="mt-2 h-20 w-full" />
        ) : !trades.data || trades.data.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No bets placed yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100 text-sm">
            {trades.data.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between py-2"
              >
                <span className="font-medium">{t.displayName}</span>
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
                  <span className="font-semibold tabular-nums">
                    {formatBucks(t.amount)} BB
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {resolveSide ? (
        <ResolveModal
          side={resolveSide}
          question={m.question}
          busy={resolveMutation.isPending}
          onCancel={() => setResolveSide(null)}
          onConfirm={(note) =>
            resolveMutation.mutate({ outcome: resolveSide, note })
          }
        />
      ) : null}
    </div>
  );
}
