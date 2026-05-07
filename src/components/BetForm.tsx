"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { MarketDetail, Side, MeProfile } from "@/lib/types";
import { MIN_BET, MAX_BET } from "@/lib/betting";
import { EstimatedPayout } from "./EstimatedPayout";
import { formatBucks } from "@/lib/format";

interface BetFormProps {
  market: MarketDetail;
  me: MeProfile;
}

const QUICK_PICKS = [25, 50, 100];

export function BetForm({ market, me }: BetFormProps) {
  const qc = useQueryClient();
  const [side, setSide] = useState<Side>("yes");
  const [rawAmount, setRawAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreator = market.createdById === me.id;

  if (market.status !== "open") {
    return null;
  }
  if (isCreator) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        You created this market, so you can&apos;t bet on it. Watch the odds
        move and resolve it fairly when the time comes.
      </div>
    );
  }

  const amount = Number.parseInt(rawAmount, 10);
  const amountValid = Number.isFinite(amount) && amount >= MIN_BET && amount <= MAX_BET;
  const enoughBalance = amountValid && amount <= me.beerBucks;
  const canSubmit = amountValid && enoughBalance && !submitting;

  function setAmountFromQuick(value: number) {
    const next = Math.min(MAX_BET, Math.min(value, me.beerBucks));
    setRawAmount(String(next));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/markets/${market.id}/bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bet failed.");
        return;
      }
      toast.success(`Placed ${amount} BB on ${side === "yes" ? "Yes" : "No"}`);
      setRawAmount("");
      qc.invalidateQueries({ queryKey: ["market", market.id] });
      qc.invalidateQueries({ queryKey: ["markets"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSide("yes")}
          className={`rounded-xl px-4 py-4 text-base font-semibold transition active:scale-[0.99] ${
            side === "yes"
              ? "bg-emerald-500 text-white shadow-sm"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          Yes · {Math.round(market.yesProbability * 100)}%
        </button>
        <button
          type="button"
          onClick={() => setSide("no")}
          className={`rounded-xl px-4 py-4 text-base font-semibold transition active:scale-[0.99] ${
            side === "no"
              ? "bg-rose-500 text-white shadow-sm"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          No · {Math.round((1 - market.yesProbability) * 100)}%
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">
          Amount{" "}
          <span className="font-normal text-stone-400">
            (you have {formatBucks(me.beerBucks)} BB)
          </span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={rawAmount}
          onChange={(e) =>
            setRawAmount(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
          placeholder={`${MIN_BET}–${MAX_BET}`}
          className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-2xl font-semibold tabular-nums outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
        />
        <div className="mt-2 grid grid-cols-3 gap-2">
          {QUICK_PICKS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmountFromQuick(v)}
              disabled={v > me.beerBucks}
              className="rounded-xl bg-stone-100 px-3 py-2 text-sm font-medium text-stone-700 transition active:scale-[0.99] disabled:opacity-50"
            >
              +{v}
            </button>
          ))}
        </div>
      </div>

      <EstimatedPayout
        yesPool={market.yesPool}
        noPool={market.noPool}
        side={side}
        amount={amountValid ? amount : 0}
      />

      {!enoughBalance && amountValid ? (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Not enough Beer Bucks for that bet.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full rounded-xl px-4 py-4 text-base font-semibold shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
          side === "yes" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
        }`}
      >
        {submitting
          ? "Placing…"
          : amountValid
          ? `Bet ${amount} BB on ${side === "yes" ? "Yes" : "No"}`
          : "Enter an amount"}
      </button>
    </form>
  );
}
