import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, jsonError } from "@/lib/api-helpers";
import { getEventId, getSupabaseServer } from "@/lib/supabase-server";
import { yesProbability } from "@/lib/betting";
import type { MarketListItem, MarketStatus, MarketRow } from "@/lib/types";

const VALID_STATUSES: ReadonlyArray<MarketStatus> = [
  "open",
  "locked",
  "resolved",
  "voided",
];

/**
 * Supabase typings model embedded relations as arrays even for single-row
 * joins. Normalize to a single object (or null).
 */
function pickOne<T>(value: unknown): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const categoryId = searchParams.get("categoryId");

  const supabase = getSupabaseServer();
  let query = supabase
    .from("markets")
    .select(
      `
      id, question, resolution_criteria, category_id, status,
      yes_pool, no_pool, closing_time, created_at, created_by,
      categories ( name, emoji ),
      creator:users!markets_created_by_fkey ( first_name, last_initial, nickname )
    `
    )
    .eq("event_id", getEventId())
    .order("created_at", { ascending: false });

  if (statusParam && (VALID_STATUSES as readonly string[]).includes(statusParam)) {
    query = query.eq("status", statusParam);
  }
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  const items: MarketListItem[] = (data ?? []).map((row) => {
    const cat = pickOne<{ name: string; emoji: string | null }>(row.categories);
    const creator = pickOne<{
      first_name: string;
      last_initial: string;
      nickname: string | null;
    }>(row.creator);
    return {
      id: row.id as string,
      question: row.question as string,
      categoryId: row.category_id as string,
      categoryName: cat?.name ?? "Misc",
      categoryEmoji: cat?.emoji ?? null,
      status: row.status as MarketStatus,
      yesPool: row.yes_pool as number,
      noPool: row.no_pool as number,
      yesProbability: yesProbability(row.yes_pool as number, row.no_pool as number),
      closingTime: row.closing_time as string | null,
      totalVolume: (row.yes_pool as number) + (row.no_pool as number),
      createdById: row.created_by as string,
      createdByDisplayName: creator
        ? `${creator.first_name} ${creator.last_initial}.${
            creator.nickname ? ` (${creator.nickname})` : ""
          }`
        : "Unknown",
      createdAt: row.created_at as string,
    };
  });

  return NextResponse.json(items);
});

const CreateMarketSchema = z.object({
  question: z.string().min(8).max(160).trim(),
  resolutionCriteria: z.string().min(10).max(500).trim(),
  categoryId: z.string().uuid(),
  closingTime: z.string().datetime().nullable().optional(),
});

export const POST = withAuth(async (request, user) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }
  const parsed = CreateMarketSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const supabase = getSupabaseServer();

  // Confirm the category belongs to this event.
  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("id", parsed.data.categoryId)
    .eq("event_id", getEventId())
    .maybeSingle();
  if (!cat) return jsonError("Unknown category.", 400);

  const { data, error } = await supabase
    .from("markets")
    .insert({
      event_id: getEventId(),
      category_id: parsed.data.categoryId,
      created_by: user.userId,
      question: parsed.data.question,
      resolution_criteria: parsed.data.resolutionCriteria,
      closing_time: parsed.data.closingTime ?? null,
      status: "open",
    })
    .select("*")
    .single<MarketRow>();

  if (error || !data) return jsonError(error?.message ?? "Failed to create market.", 500);

  return NextResponse.json({ id: data.id }, { status: 201 });
});
