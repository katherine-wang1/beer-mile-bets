import { NextResponse } from "next/server";
import { withAdmin, jsonError } from "@/lib/api-helpers";
import { getSupabaseServer } from "@/lib/supabase-server";
import type { Side, UserRow } from "@/lib/types";
import { displayName as fmtDisplayName } from "@/lib/format";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface TradeWithUser {
  id: string;
  side: Side;
  amount: number;
  created_at: string;
  users:
    | Pick<UserRow, "id" | "first_name" | "last_initial" | "nickname">
    | Array<Pick<UserRow, "id" | "first_name" | "last_initial" | "nickname">>
    | null;
}

function pickOne<T>(value: unknown): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

export const GET = withAdmin<RouteContext>(async (_request, _user, context) => {
  const { id } = await context.params;
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("trades")
    .select(
      `
      id, side, amount, created_at,
      users ( id, first_name, last_initial, nickname )
      `
    )
    .eq("market_id", id)
    .order("created_at", { ascending: false });
  if (error) return jsonError(error.message, 500);

  const rows = (data ?? []) as TradeWithUser[];
  return NextResponse.json(
    rows.map((t) => {
      const user = pickOne<
        Pick<UserRow, "id" | "first_name" | "last_initial" | "nickname">
      >(t.users);
      return {
        id: t.id,
        side: t.side,
        amount: t.amount,
        createdAt: t.created_at,
        userId: user?.id ?? null,
        displayName: user ? fmtDisplayName(user) : "(unknown)",
      };
    })
  );
});
