import { NextResponse } from "next/server";
import { withAuth, jsonError } from "@/lib/api-helpers";
import { getSupabaseServer } from "@/lib/supabase-server";
import { displayName as fmtDisplayName } from "@/lib/format";
import type { LeaderboardEntry, UserRow } from "@/lib/types";

export const GET = withAuth(async (_request, user) => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_initial, nickname, beer_bucks")
    .order("beer_bucks", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return jsonError(error.message, 500);

  const entries: LeaderboardEntry[] = (data as Pick<
    UserRow,
    "id" | "first_name" | "last_initial" | "nickname" | "beer_bucks"
  >[]).map((row, i) => ({
    rank: i + 1,
    userId: row.id,
    displayName: fmtDisplayName(row),
    beerBucks: row.beer_bucks,
    isMe: row.id === user.userId,
  }));

  return NextResponse.json(entries);
});
