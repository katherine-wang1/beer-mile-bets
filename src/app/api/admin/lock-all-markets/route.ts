import { NextResponse } from "next/server";
import { withAdmin, jsonError } from "@/lib/api-helpers";
import { getEventId, getSupabaseServer } from "@/lib/supabase-server";

export const POST = withAdmin(async () => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .rpc("lock_all_open_markets", { p_event_id: getEventId() })
    .single<number>();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ lockedCount: data ?? 0 });
});
