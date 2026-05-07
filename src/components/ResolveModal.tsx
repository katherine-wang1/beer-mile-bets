"use client";

import { useState } from "react";
import type { Side } from "@/lib/types";

interface ResolveModalProps {
  side: Side;
  question: string;
  onConfirm: (note: string) => Promise<void> | void;
  onCancel: () => void;
  busy?: boolean;
}

export function ResolveModal({
  side,
  question,
  onConfirm,
  onCancel,
  busy,
}: ResolveModalProps) {
  const [note, setNote] = useState("");
  const valid = note.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-3 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
        <h2 className="text-base font-bold tracking-tight">
          Resolve as <span className={side === "yes" ? "text-emerald-600" : "text-rose-600"}>
            {side === "yes" ? "Yes" : "No"}
          </span>
          ?
        </h2>
        <p className="mt-1 text-sm text-stone-500 line-clamp-2">{question}</p>
        <p className="mt-2 text-xs text-stone-500">
          Payouts will be distributed immediately and cannot be undone from the
          UI. Add a brief, public note explaining the resolution.
        </p>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={
            side === "yes"
              ? "e.g. Confirmed by 3 witnesses at the finish line."
              : "e.g. Race ended without that happening."
          }
          className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
        />
        <p className="mt-1 text-xs text-stone-400">
          Min 10 characters. {note.trim().length} / 500
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl bg-stone-100 px-4 py-3 text-sm font-medium text-stone-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid || busy}
            onClick={() => onConfirm(note.trim())}
            className={`rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
              side === "yes" ? "bg-emerald-500" : "bg-rose-500"
            }`}
          >
            {busy ? "Resolving…" : `Resolve ${side === "yes" ? "Yes" : "No"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
