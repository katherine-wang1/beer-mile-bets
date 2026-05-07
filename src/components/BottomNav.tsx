"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListOrdered, Trophy, User, Shield } from "lucide-react";
import type { Role } from "@/lib/types";

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/markets",
    label: "Markets",
    icon: ListOrdered,
    match: (p: string) => p.startsWith("/markets"),
  },
  {
    href: "/leaderboard",
    label: "Leaders",
    icon: Trophy,
    match: (p: string) => p === "/leaderboard",
  },
  {
    href: "/profile",
    label: "Me",
    icon: User,
    match: (p: string) => p === "/profile",
  },
] as const;

export function BottomNav({ role }: { role?: Role }) {
  const pathname = usePathname();
  const isAdmin = role === "admin";

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur">
      <div
        className={`mx-auto grid max-w-3xl ${
          isAdmin ? "grid-cols-5" : "grid-cols-4"
        } gap-1 px-2 py-2`}
      >
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition ${
                active ? "text-amber-600" : "text-stone-500"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`}
                aria-hidden
              />
              {t.label}
            </Link>
          );
        })}
        {isAdmin ? (
          <Link
            href="/admin"
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition ${
              pathname.startsWith("/admin") ? "text-amber-600" : "text-stone-500"
            }`}
          >
            <Shield
              className={`h-5 w-5 ${
                pathname.startsWith("/admin") ? "stroke-[2.5]" : ""
              }`}
              aria-hidden
            />
            Admin
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
