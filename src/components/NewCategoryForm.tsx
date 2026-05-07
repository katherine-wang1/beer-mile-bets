"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const EMOJI_OPTIONS = ["🏃", "🍻", "🤮", "🏆", "🎲", "⚡", "🥇", "👟", "⏱", "🥴", "💪", "🎤"];

export function NewCategoryForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎲");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = name.trim().length >= 2;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), emoji }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create category.");
        return;
      }
      toast.success("Category created");
      qc.invalidateQueries({ queryKey: ["categories"] });
      router.back();
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
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back
      </Link>
      <h1 className="text-xl font-bold tracking-tight">New category</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-stone-700">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Shoe Malfunctions"
            maxLength={40}
            required
            className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700">
            Emoji
          </label>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`flex h-12 items-center justify-center rounded-xl border text-xl transition ${
                  emoji === e
                    ? "border-amber-400 bg-amber-50"
                    : "border-stone-200 bg-white"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
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
          {submitting ? "Creating…" : "Create category"}
        </button>
      </form>
    </div>
  );
}
