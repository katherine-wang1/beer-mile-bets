"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type {
  MarketListItem,
  MarketDetail,
  MeProfile,
  EventStatus,
  LeaderboardEntry,
} from "./types";

interface CategoryDto {
  id: string;
  name: string;
  emoji: string | null;
  isDefault: boolean;
}

interface EventDto {
  id: string;
  name: string;
  description: string | null;
  status: EventStatus;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    let message = "Request failed";
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch {
      /* noop */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function useMe(opts?: Partial<UseQueryOptions<MeProfile>>) {
  return useQuery<MeProfile>({
    queryKey: ["me"],
    queryFn: () => getJson<MeProfile>("/api/users/me"),
    ...opts,
  });
}

export function useEvent() {
  return useQuery<EventDto>({
    queryKey: ["event"],
    queryFn: () => getJson<EventDto>("/api/event"),
  });
}

export function useCategories() {
  return useQuery<CategoryDto[]>({
    queryKey: ["categories"],
    queryFn: () => getJson<CategoryDto[]>("/api/categories"),
  });
}

export function useMarkets(filter?: { status?: string; categoryId?: string }) {
  const params = new URLSearchParams();
  if (filter?.status) params.set("status", filter.status);
  if (filter?.categoryId) params.set("categoryId", filter.categoryId);
  const qs = params.toString();
  return useQuery<MarketListItem[]>({
    queryKey: ["markets", filter ?? {}],
    queryFn: () =>
      getJson<MarketListItem[]>(`/api/markets${qs ? `?${qs}` : ""}`),
  });
}

export function useMarket(id: string) {
  return useQuery<MarketDetail>({
    queryKey: ["market", id],
    queryFn: () => getJson<MarketDetail>(`/api/markets/${id}`),
    enabled: !!id,
  });
}

export function useLeaderboard() {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: () => getJson<LeaderboardEntry[]>("/api/leaderboard"),
  });
}

export interface PortfolioTrade {
  id: string;
  side: "yes" | "no";
  amount: number;
  createdAt: string;
  marketId: string;
  marketQuestion: string;
  marketStatus: "open" | "locked" | "resolved" | "voided";
  marketResolvedOutcome: "yes" | "no" | null;
}

export interface PortfolioCreatedMarket {
  id: string;
  question: string;
  status: "open" | "locked" | "resolved" | "voided";
  yesPool: number;
  noPool: number;
  resolvedOutcome: "yes" | "no" | null;
  totalVolume: number;
  createdAt: string;
}

export function usePortfolio() {
  return useQuery<{
    trades: PortfolioTrade[];
    createdMarkets: PortfolioCreatedMarket[];
  }>({
    queryKey: ["portfolio"],
    queryFn: () =>
      getJson<{ trades: PortfolioTrade[]; createdMarkets: PortfolioCreatedMarket[] }>(
        "/api/users/me/portfolio"
      ),
  });
}
