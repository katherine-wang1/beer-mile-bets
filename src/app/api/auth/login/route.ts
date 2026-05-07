import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";
import { jsonError } from "@/lib/api-helpers";
import { displayName as fmtDisplayName } from "@/lib/format";
import type { UserRow } from "@/lib/types";

const LoginSchema = z.object({
  firstName: z.string().min(1).max(40).trim(),
  lastInitial: z.string().length(1).regex(/^[a-zA-Z]$/),
  nickname: z
    .string()
    .max(20)
    .trim()
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const { firstName, lastInitial, nickname, pin } = parsed.data;
  const normalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const normalizedInitial = lastInitial.toUpperCase();

  const supabase = getSupabaseServer();

  let query = supabase
    .from("users")
    .select("*")
    .eq("first_name", normalizedFirstName)
    .eq("last_initial", normalizedInitial);

  query = nickname ? query.eq("nickname", nickname) : query.is("nickname", null);

  const { data: user, error } = await query.maybeSingle<UserRow>();

  if (error) {
    return jsonError(error.message, 500);
  }
  if (!user) {
    return jsonError("Name or PIN is incorrect.", 401);
  }

  const ok = await bcrypt.compare(pin, user.pin_hash);
  if (!ok) {
    return jsonError("Name or PIN is incorrect.", 401);
  }

  const session = await getSession();
  session.userId = user.id;
  session.displayName = fmtDisplayName(user);
  session.role = user.role;
  await session.save();

  return NextResponse.json({
    id: user.id,
    displayName: fmtDisplayName(user),
    beerBucks: user.beer_bucks,
    role: user.role,
  });
}
