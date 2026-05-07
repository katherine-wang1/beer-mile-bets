"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { useMe, usePortfolio } from "@/lib/hooks";
import { Skeleton } from "./ui/Skeleton";
import { formatBucks } from "@/lib/format";

export function ProfileView() {
  const router = useRouter();
  const me = useMe();
  const portfolio = usePortfolio();

  if (me.isLoading || portfolio.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!me.data || !portfolio.data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Couldn&apos;t load your profile.
      </div>
    );
  }

  const openPositions = portfolio.data.trades.filter(
    (t) => t.marketStatus === "open" || t.marketStatus === "locked"
  );
  const settledTrades = portfolio.data.trades.filter(
    (t) => t.marketStatus === "resolved" || t.marketStatus === "voided"
  );

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast("Logged out");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Couldn't log out.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Logged in as
            </div>
            <div className="text-lg font-bold tracking-tight">
              {me.data.displayName}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-wide text-stone-400">
              Balance
            </div>
            <div className="text-2xl font-bold tabular-nums text-amber-600">
              {formatBucks(me.data.beerBucks)}
            </div>
            <div className="text-[11px] text-stone-400">Beer Bucks</div>
          </div>
        </div>
      </div>

      <Section title="Open positions" empty="No active bets right now.">
        {openPositions.length > 0 && (
          <ul className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {openPositions.map((t, i) => (
              <li
                key={t.id}
                className={`px-4 py-3 ${
                  i !== openPositions.length - 1
                    ? "border-b border-stone-100"
                    : ""
                }`}
              >
                <Link href={`/markets/${t.marketId}`} className="block">
                  <div className="flex items-center justify-between gap-3">
                    <span className="line-clamp-1 text-sm font-medium">
                      {t.marketQuestion}
                    </span>
                    <SideBadge side={t.side} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-stone-500">
                    <span>
                      {new Date(t.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="font-semibold tabular-nums text-stone-700">
                      {formatBucks(t.amount)} BB
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {openPositions.length === 0 && (
          <EmptyHint>No active bets right now.</EmptyHint>
        )}
      </Section>

      <Section title="Bet history" empty="You haven't placed any bets yet.">
        {settledTrades.length > 0 && (
          <ul className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {settledTrades.slice(0, 50).map((t, i) => (
              <li
                key={t.id}
                className={`px-4 py-3 ${
                  i !== Math.min(settledTrades.length, 50) - 1
                    ? "border-b border-stone-100"
                    : ""
                }`}
              >
                <Link href={`/markets/${t.marketId}`} className="block">
                  <div className="flex items-center justify-between gap-3">
                    <span className="line-clamp-1 text-sm font-medium">
                      {t.marketQuestion}
                    </span>
                    <ResultBadge
                      betSide={t.side}
                      outcome={t.marketResolvedOutcome}
                      voided={t.marketStatus === "voided"}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-stone-500">
                    <span>
                      {new Date(t.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="font-semibold tabular-nums text-stone-700">
                      {formatBucks(t.amount)} BB on {t.side}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {settledTrades.length === 0 && (
          <EmptyHint>You haven&apos;t placed any bets yet.</EmptyHint>
        )}
      </Section>

      <Section
        title="Markets you created"
        empty="You haven't created any markets."
      >
        {portfolio.data.createdMarkets.length > 0 && (
          <ul className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {portfolio.data.createdMarkets.map((m, i) => (
              <li
                key={m.id}
                className={`px-4 py-3 ${
                  i !== portfolio.data.createdMarkets.length - 1
                    ? "border-b border-stone-100"
                    : ""
                }`}
              >
                <Link href={`/markets/${m.id}`} className="block">
                  <div className="line-clamp-1 text-sm font-medium">
                    {m.question}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">
                    {formatBucks(m.totalVolume)} BB · {m.status}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {portfolio.data.createdMarkets.length === 0 && (
          <EmptyHint>You haven&apos;t created any markets.</EmptyHint>
        )}
      </Section>

      <button
        type="button"
        onClick={onLogout}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700"
      >
        <LogOut className="h-4 w-4" aria-hidden /> Log out
      </button>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 px-4 py-5 text-center text-sm text-stone-500">
      {children}
    </div>
  );
}

function SideBadge({ side }: { side: "yes" | "no" }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        side === "yes"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-rose-100 text-rose-700"
      }`}
    >
      {side}
    </span>
  );
}

function ResultBadge({
  betSide,
  outcome,
  voided,
}: {
  betSide: "yes" | "no";
  outcome: "yes" | "no" | null;
  voided: boolean;
}) {
  if (voided) {
    return (
      <span className="inline-flex shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-stone-600">
        Refunded
      </span>
    );
  }
  if (outcome === null) return <SideBadge side={betSide} />;
  const won = betSide === outcome;
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        won ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
      }`}
    >
      {won ? "Won" : "Lost"}
    </span>
  );
}
