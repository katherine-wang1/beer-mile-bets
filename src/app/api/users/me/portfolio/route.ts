import { NextResponse } from "next/server";
import { withAuth, jsonError } from "@/lib/api-helpers";
import { getEventId, getSupabaseServer } from "@/lib/supabase-server";
import type { Side, MarketStatus } from "@/lib/types";

interface TradeWithMarket {
  id: string;
  side: Side;
  amount: number;
  created_at: string;
  market_id: string;
  markets:
    | {
        question: string;
        status: MarketStatus;
        resolved_outcome: Side | null;
      }
    | Array<{
        question: string;
        status: MarketStatus;
        resolved_outcome: Side | null;
      }>
    | null;
}

interface CreatedMarketRow {
  id: string;
  question: string;
  status: MarketStatus;
  yes_pool: number;
  no_pool: number;
  resolved_outcome: Side | null;
  created_at: string;
}

function pickOne<T>(value: unknown): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

export const GET = withAuth(async (_request, user) => {
  const supabase = getSupabaseServer();

  const { data: trades, error: tradesError } = await supabase
    .from("trades")
    .select(
      `
      id, side, amount, created_at, market_id,
      markets ( question, status, resolved_outcome )
      `
    )
    .eq("user_id", user.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (tradesError) return jsonError(tradesError.message, 500);

  const { data: created, error: createdError } = await supabase
    .from("markets")
    .select(
      "id, question, status, yes_pool, no_pool, resolved_outcome, created_at"
    )
    .eq("event_id", getEventId())
    .eq("created_by", user.userId)
    .order("created_at", { ascending: false });

  if (createdError) return jsonError(createdError.message, 500);

  const tradeRows = (trades ?? []) as TradeWithMarket[];
  const createdRows = (created ?? []) as CreatedMarketRow[];

  return NextResponse.json({
    trades: tradeRows.map((t) => {
      const m = pickOne<{
        question: string;
        status: MarketStatus;
        resolved_outcome: Side | null;
      }>(t.markets);
      return {
        id: t.id,
        side: t.side,
        amount: t.amount,
        createdAt: t.created_at,
        marketId: t.market_id,
        marketQuestion: m?.question ?? "(unknown market)",
        marketStatus: (m?.status ?? "open") as MarketStatus,
        marketResolvedOutcome: m?.resolved_outcome ?? null,
      };
    }),
    createdMarkets: createdRows.map((m) => ({
      id: m.id,
      question: m.question,
      status: m.status,
      yesPool: m.yes_pool,
      noPool: m.no_pool,
      resolvedOutcome: m.resolved_outcome,
      totalVolume: m.yes_pool + m.no_pool,
      createdAt: m.created_at,
    })),
  });
});
