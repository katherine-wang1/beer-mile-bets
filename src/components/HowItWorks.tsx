"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { HelpCircle, X } from "lucide-react";

const STORAGE_KEY = "bmb:hasSeenHowTo";

function readHasSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function writeHasSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function HowItWorks() {
  const titleId = useId();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  useEffect(() => {
    startTransition(() => {
      if (!readHasSeen()) {
        setModalOpen(true);
        writeHasSeen();
      }
    });
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  const openModal = () => setModalOpen(true);

  const browseMarkets = () => {
    closeModal();
    requestAnimationFrame(() => {
      document.getElementById("live-markets-feed")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <>
      {!bannerDismissed ? (
        <div className="relative flex items-stretch gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 pr-10 shadow-sm">
          <button
            type="button"
            onClick={openModal}
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-white">
              <HelpCircle className="h-5 w-5" aria-hidden />
            </span>
            <span className="pt-0.5 text-sm font-medium text-stone-800">
              <span className="mr-1" aria-hidden>
                👋
              </span>
              New here? See how Beer Mile Bets works →
            </span>
          </button>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="absolute right-2 top-2 rounded-lg p-1.5 text-stone-500 hover:bg-amber-100 hover:text-stone-700"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/40 p-3 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[min(85vh,640px)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id={titleId}
                  className="text-base font-bold tracking-tight text-stone-900"
                >
                  How it works
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  A 30-second tour 🍻
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-stone-700 marker:font-semibold">
              <li>
                <span className="font-semibold text-stone-900">
                  You start with 500 Beer Bucks.
                </span>{" "}
                Play money, no real cash. Build the biggest stack by the time
                the last runner crosses the line.
              </li>
              <li>
                <span className="font-semibold text-stone-900">
                  Bet on any open market.
                </span>{" "}
                Tap <strong>Yes</strong> or <strong>No</strong> on a
                prediction. Prices move as people pile in, so early calls often
                pay the best.
              </li>
              <li>
                <span className="font-semibold text-stone-900">
                  Create your own markets.
                </span>{" "}
                {
                  `Got a hot take? ("Quang wins Men's", "Marcello throws up on Lap 3") — `
                }
                spin one up and let the crowd weigh in. Just know you can&apos;t
                bet on markets you created (keeps it fair).
              </li>
              <li>
                <span className="font-semibold text-stone-900">
                  Race ends → markets settle → leaderboard drops 🏆
                </span>{" "}
                When each race wraps, winning bets pay out automatically. Check
                the leaderboard to see who called it best.
              </li>
            </ol>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm active:scale-[0.99]"
              >
                Let&apos;s go
              </button>
              <button
                type="button"
                onClick={browseMarkets}
                className="rounded-xl bg-stone-100 px-4 py-3 text-sm font-medium text-stone-700"
              >
                Browse markets
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
