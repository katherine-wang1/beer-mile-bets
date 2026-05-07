import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, jsonError, mapPgError } from "@/lib/api-helpers";
import { getSupabaseServer } from "@/lib/supabase-server";
import { yesProbability, MIN_BET, MAX_BET } from "@/lib/betting";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const BetSchema = z.object({
  side: z.enum(["yes", "no"]),
  amount: z.number().int().min(MIN_BET).max(MAX_BET),
});

interface PlaceBetResult {
  trade_id: string;
  new_balance: number;
  yes_pool: number;
  no_pool: number;
  market_status: "open" | "locked" | "resolved" | "voided";
}

export const POST = withAuth<RouteContext>(async (request, user, context) => {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }
  const parsed = BetSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid bet.", 400);
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .rpc("place_bet", {
      p_market_id: id,
      p_user_id: user.userId,
      p_side: parsed.data.side,
      p_amount: parsed.data.amount,
    })
    .single<PlaceBetResult>();

  if (error) {
    const mapped = mapPgError(error);
    return jsonError(mapped.message, mapped.status, error.code);
  }
  if (!data) return jsonError("Bet failed.", 500);

  return NextResponse.json(
    {
      tradeId: data.trade_id,
      newBalance: data.new_balance,
      market: {
        yesPool: data.yes_pool,
        noPool: data.no_pool,
        yesProbability: yesProbability(data.yes_pool, data.no_pool),
        status: data.market_status,
      },
    },
    { status: 201 }
  );
});
