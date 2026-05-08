"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { useCategories } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";

export function NewMarketForm() {
  const router = useRouter();
  const categories = useCategories();
  const qc = useQueryClient();

  const [question, setQuestion] = useState("");
  const [criteria, setCriteria] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [closingTime, setClosingTime] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    question.trim().length >= 8 &&
    criteria.trim().length >= 10 &&
    categoryId.length > 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          resolutionCriteria: criteria.trim(),
          categoryId,
          closingTime: closingTime ? new Date(closingTime).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create market.");
        return;
      }
      toast.success("Market created");
      qc.invalidateQueries({ queryKey: ["markets"] });
      router.push(`/markets/${data.id}`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Link
        href="/markets"
        className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Markets
      </Link>
      <h1 className="text-xl font-bold tracking-tight">Create a market</h1>
      <p className="mt-1 text-sm text-stone-500">
        Anyone can create. Markets go live immediately.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Question
          </label>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will Marcello throw up?"
            maxLength={160}
            required
            className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
          />
          <p className="mt-1 text-xs text-stone-400">
            Phrase as a yes/no question.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700">
            Resolution criteria
          </label>
          <textarea
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            placeholder="Yes if he throws up at any point in the race, No otherwise"
            maxLength={500}
            rows={3}
            required
            className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
          />
          <p className="mt-1 text-xs text-stone-400">
            Be specific so the admin can resolve unambiguously.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-stone-700">
              Category
            </label>
            <Link
              href="/categories/new"
              className="text-xs font-medium text-amber-600"
            >
              + new category
            </Link>
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
          >
            <option value="" disabled>
              Pick one…
            </option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji ? `${c.emoji} ` : ""}
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700">
            Closing time{" "}
            <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <input
            type="datetime-local"
            value={closingTime}
            onChange={(e) => setClosingTime(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
          />
          <p className="mt-1 text-xs text-stone-400">
            When this passes, the market locks automatically. Leave blank to
            lock manually.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="w-full rounded-xl bg-amber-400 px-4 py-3.5 text-base font-semibold text-stone-900 shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create market"}
        </button>
      </form>
    </div>
  );
}
