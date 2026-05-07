"use client";

import type { EventStatus } from "@/lib/types";

interface BannerCopy {
  text: string;
  className: string;
}

const COPY: Record<EventStatus, BannerCopy | null> = {
  upcoming: null,
  active: {
    text: "🏁 Race is live — markets are locked",
    className: "bg-rose-50 text-rose-700",
  },
  completed: {
    text: "🏆 Final results are in",
    className: "bg-emerald-50 text-emerald-700",
  },
};

export function EventStatusBanner({ status }: { status?: EventStatus }) {
  if (!status) return null;
  const copy = COPY[status];
  if (!copy) return null;
  return (
    <div
      className={`mx-auto max-w-3xl px-4 py-1.5 text-center text-xs font-medium ${copy.className}`}
    >
      {copy.text}
    </div>
  );
}
