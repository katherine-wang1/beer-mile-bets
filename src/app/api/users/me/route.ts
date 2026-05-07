import { NextResponse } from "next/server";
import { withAuth, jsonError } from "@/lib/api-helpers";
import { getSupabaseServer } from "@/lib/supabase-server";
import { displayName as fmtDisplayName } from "@/lib/format";
import type { UserRow } from "@/lib/types";

export const GET = withAuth(async (_request, user) => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.userId)
    .maybeSingle<UserRow>();

  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("User not found.", 404);

  return NextResponse.json({
    id: data.id,
    displayName: fmtDisplayName(data),
    beerBucks: data.beer_bucks,
    role: data.role,
  });
});
