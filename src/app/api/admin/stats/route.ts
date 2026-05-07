import { NextResponse } from "next/server";
import { withAdmin, jsonError } from "@/lib/api-helpers";
import { getEventId, getSupabaseServer } from "@/lib/supabase-server";

interface MarketAggRow {
  status: string;
  yes_pool: number;
  no_pool: number;
}

export const GET = withAdmin(async () => {
  const supabase = getSupabaseServer();
  const { data: rows, error } = await supabase
    .from("markets")
    .select("status, yes_pool, no_pool")
    .eq("event_id", getEventId());
  if (error) return jsonError(error.message, 500);

  const stats = {
    open: 0,
    locked: 0,
    resolved: 0,
    voided: 0,
    totalVolume: 0,
  };

  for (const row of (rows ?? []) as MarketAggRow[]) {
    if (row.status in stats) {
      (stats as unknown as Record<string, number>)[row.status] += 1;
    }
    stats.totalVolume += row.yes_pool + row.no_pool;
  }

  const { count: userCount } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    openMarkets: stats.open,
    lockedMarkets: stats.locked,
    resolvedMarkets: stats.resolved,
    voidedMarkets: stats.voided,
    totalVolume: stats.totalVolume,
    totalUsers: userCount ?? 0,
  });
});
