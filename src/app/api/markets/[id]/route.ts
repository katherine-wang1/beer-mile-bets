import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, withAdmin, jsonError, mapPgError } from "@/lib/api-helpers";
import { getSupabaseServer } from "@/lib/supabase-server";
import { yesProbability } from "@/lib/betting";
import type { MarketDetail, MarketRow, MarketStatus, Side } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function pickOne<T>(value: unknown): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

export const GET = withAuth<RouteContext>(async (_request, user, context) => {
  const { id } = await context.params;
  const supabase = getSupabaseServer();

  const { data: marketRow, error: marketError } = await supabase
    .from("markets")
    .select(
      `
      id, question, resolution_criteria, category_id, status,
      yes_pool, no_pool, closing_time, created_at, created_by,
      resolved_outcome, resolved_at, resolution_note,
      categories ( name, emoji ),
      creator:users!markets_created_by_fkey ( first_name, last_initial, nickname )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (marketError) return jsonError(marketError.message, 500);
  if (!marketRow) return jsonError("Market not found.", 404);

  // Lazy-lock check on read: if past closing_time and still open, mark locked.
  let status = marketRow.status as MarketStatus;
  const closing = marketRow.closing_time as string | null;
  if (status === "open" && closing && new Date(closing).getTime() <= Date.now()) {
    const { error: lockError } = await supabase
      .from("markets")
      .update({ status: "locked" })
      .eq("id", id)
      .eq("status", "open");
    if (!lockError) {
      status = "locked";
    }
  }

  const { data: trades, error: tradesError } = await supabase
    .from("trades")
    .select("id, side, amount, created_at")
    .eq("market_id", id)
    .eq("user_id", user.userId)
    .order("created_at", { ascending: false });

  if (tradesError) return jsonError(tradesError.message, 500);

  const cat = pickOne<{ name: string; emoji: string | null }>(
    marketRow.categories
  );
  const creator = pickOne<{
    first_name: string;
    last_initial: string;
    nickname: string | null;
  }>(marketRow.creator);

  const detail: MarketDetail = {
    id: marketRow.id as string,
    question: marketRow.question as string,
    resolutionCriteria: marketRow.resolution_criteria as string,
    categoryId: marketRow.category_id as string,
    categoryName: cat?.name ?? "Misc",
    categoryEmoji: cat?.emoji ?? null,
    status,
    yesPool: marketRow.yes_pool as number,
    noPool: marketRow.no_pool as number,
    yesProbability: yesProbability(
      marketRow.yes_pool as number,
      marketRow.no_pool as number
    ),
    closingTime: closing,
    totalVolume: (marketRow.yes_pool as number) + (marketRow.no_pool as number),
    createdById: marketRow.created_by as string,
    createdByDisplayName: creator
      ? `${creator.first_name} ${creator.last_initial}.${
          creator.nickname ? ` (${creator.nickname})` : ""
        }`
      : "Unknown",
    createdAt: marketRow.created_at as string,
    resolvedOutcome: marketRow.resolved_outcome as Side | null,
    resolvedAt: marketRow.resolved_at as string | null,
    resolutionNote: marketRow.resolution_note as string | null,
    myTrades: (trades ?? []).map((t) => ({
      id: t.id as string,
      side: t.side as Side,
      amount: t.amount as number,
      createdAt: t.created_at as string,
    })),
  };

  return NextResponse.json(detail);
});

const PatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("lock") }),
  z.object({
    action: z.literal("resolve"),
    outcome: z.enum(["yes", "no"]),
    note: z.string().min(10).max(500).trim(),
  }),
  z.object({
    action: z.literal("void"),
    note: z.string().max(500).trim().optional(),
  }),
]);

export const PATCH = withAdmin<RouteContext>(async (request, user, context) => {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const supabase = getSupabaseServer();

  if (parsed.data.action === "lock") {
    const { data, error } = await supabase
      .rpc("lock_market", { p_market_id: id })
      .single<MarketRow>();
    if (error) {
      const m = mapPgError(error);
      return jsonError(m.message, m.status, error.code);
    }
    return NextResponse.json(data);
  }

  if (parsed.data.action === "resolve") {
    const { data, error } = await supabase
      .rpc("resolve_market", {
        p_market_id: id,
        p_outcome: parsed.data.outcome,
        p_note: parsed.data.note,
        p_admin_id: user.userId,
      })
      .single<MarketRow>();
    if (error) {
      const m = mapPgError(error);
      return jsonError(m.message, m.status, error.code);
    }
    return NextResponse.json(data);
  }

  // void
  const { data, error } = await supabase
    .rpc("void_market", {
      p_market_id: id,
      p_admin_id: user.userId,
      p_note: parsed.data.note ?? null,
    })
    .single<MarketRow>();
  if (error) {
    const m = mapPgError(error);
    return jsonError(m.message, m.status, error.code);
  }
  return NextResponse.json(data);
});
