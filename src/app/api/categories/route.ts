import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, jsonError } from "@/lib/api-helpers";
import { getEventId, getSupabaseServer } from "@/lib/supabase-server";
import type { CategoryRow } from "@/lib/types";

export const GET = withAuth(async () => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("event_id", getEventId())
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return jsonError(error.message, 500);

  return NextResponse.json(
    (data as CategoryRow[]).map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      isDefault: c.is_default,
    }))
  );
});

const CreateCategorySchema = z.object({
  name: z.string().min(2).max(40).trim(),
  emoji: z.string().max(8).trim().optional().nullable(),
});

export const POST = withAuth(async (request, user) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }
  const parsed = CreateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }
  const { name, emoji } = parsed.data;

  const supabase = getSupabaseServer();
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("event_id", getEventId())
    .ilike("name", name)
    .maybeSingle();
  if (existing) {
    return jsonError("A category with that name already exists.", 409);
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      event_id: getEventId(),
      name,
      emoji: emoji ?? null,
      is_default: false,
      created_by: user.userId,
    })
    .select("*")
    .single<CategoryRow>();

  if (error || !data) return jsonError(error?.message ?? "Failed to create.", 500);

  return NextResponse.json(
    {
      id: data.id,
      name: data.name,
      emoji: data.emoji,
      isDefault: data.is_default,
    },
    { status: 201 }
  );
});
