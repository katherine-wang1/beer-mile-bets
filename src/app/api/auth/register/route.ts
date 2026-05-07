import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getSession } from "@/lib/session";
import { jsonError } from "@/lib/api-helpers";
import { displayName as fmtDisplayName } from "@/lib/format";
import type { UserRow } from "@/lib/types";

const RegisterSchema = z.object({
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

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const { firstName, lastInitial, nickname, pin } = parsed.data;
  const normalizedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const normalizedInitial = lastInitial.toUpperCase();

  const supabase = getSupabaseServer();

  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("first_name", normalizedFirstName)
    .eq("last_initial", normalizedInitial)
    .is("nickname", nickname === null ? null : null)
    .maybeSingle();

  if (existingError) {
    return jsonError(existingError.message, 500);
  }

  let nameTaken = !!existing;
  if (!nameTaken && nickname) {
    const { data: nickExisting } = await supabase
      .from("users")
      .select("id")
      .eq("first_name", normalizedFirstName)
      .eq("last_initial", normalizedInitial)
      .eq("nickname", nickname)
      .maybeSingle();
    nameTaken = !!nickExisting;
  }
  if (nameTaken) {
    return jsonError(
      nickname
        ? "That name + nickname is already taken."
        : "That name is already taken — try adding a nickname.",
      409
    );
  }

  const pinHash = await bcrypt.hash(pin, 10);

  const { data: created, error: insertError } = await supabase
    .from("users")
    .insert({
      first_name: normalizedFirstName,
      last_initial: normalizedInitial,
      nickname,
      pin_hash: pinHash,
    })
    .select("*")
    .single<UserRow>();

  if (insertError || !created) {
    if (insertError?.code === "23505") {
      return jsonError("That name is already taken.", 409);
    }
    return jsonError(insertError?.message ?? "Failed to create account.", 500);
  }

  const session = await getSession();
  session.userId = created.id;
  session.displayName = fmtDisplayName(created);
  session.role = created.role;
  await session.save();

  return NextResponse.json(
    {
      id: created.id,
      displayName: fmtDisplayName(created),
      beerBucks: created.beer_bucks,
      role: created.role,
    },
    { status: 201 }
  );
}
