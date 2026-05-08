"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Beer } from "lucide-react";

type Mode = "register" | "login";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [mode, setMode] = useState<Mode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastInitial, setLastInitial] = useState("");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    firstName.trim().length > 0 &&
    /^[a-zA-Z]$/.test(lastInitial) &&
    /^\d{4}$/.test(pin);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastInitial,
          nickname: nickname.trim() || null,
          pin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      toast.success(
        mode === "register"
          ? `Welcome, ${data.displayName}!`
          : `Welcome back, ${data.displayName}!`
      );
      router.push(next);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(target: Mode) {
    setMode(target);
    setError(null);
  }

  return (
    <div className="flex min-h-screen-safe flex-1 flex-col">
      {mode === "login" ? (
        <div
          role="note"
          className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-center text-sm text-stone-700"
        >
          First time on Beer Mile Bets?{" "}
          <button
            type="button"
            onClick={() => switchMode("register")}
            className="font-semibold text-amber-800 underline-offset-2 hover:underline"
          >
            Sign up below
          </button>
        </div>
      ) : null}

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-white shadow-sm">
              <Beer className="h-7 w-7" aria-hidden />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Beer Mile Bets</h1>
            <p className="mt-1 text-sm text-stone-500">
              {mode === "register"
                ? "Pick a name + PIN to get your 500 Beer Bucks."
                : "Welcome back. Enter your name + PIN."}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600">
                  First name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  autoComplete="given-name"
                  required
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-stone-600">
                  Last initial
                </label>
                <input
                  value={lastInitial}
                  onChange={(e) =>
                    setLastInitial(
                      e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 1)
                    )
                  }
                  maxLength={1}
                  autoCapitalize="characters"
                  required
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-center text-base font-semibold uppercase outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600">
                Nickname{" "}
                <span className="font-normal text-stone-400">
                  (optional, only if your name is taken)
                </span>
              </label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Nickname (optional)"
                maxLength={20}
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600">
                4-digit PIN
              </label>
              <input
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="••••"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                required
                className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-center text-2xl font-semibold tracking-[0.5em] tabular-nums outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              />
            </div>

            {error ? (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!isValid || submitting}
              className="mt-2 w-full rounded-xl bg-amber-400 px-4 py-3.5 text-base font-semibold text-stone-900 shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "..."
                : mode === "register"
                  ? "Create account"
                  : "Log in"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-stone-500">
            {mode === "register" ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() =>
                switchMode(mode === "register" ? "login" : "register")
              }
              className="font-medium text-amber-600 underline-offset-2 hover:underline"
            >
              {mode === "register" ? "Log in" : "Create one"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
