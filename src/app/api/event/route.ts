import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, withAdmin, jsonError } from "@/lib/api-helpers";
import { getEventId, getSupabaseServer } from "@/lib/supabase-server";
import type { EventRow } from "@/lib/types";

export const GET = withAuth(async () => {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", getEventId())
    .maybeSingle<EventRow>();

  if (error) return jsonError(error.message, 500);
  if (!data) return jsonError("Event not found.", 404);

  return NextResponse.json({
    id: data.id,
    name: data.name,
    description: data.description,
    status: data.status,
  });
});

const PatchSchema = z.object({
  status: z.enum(["upcoming", "active", "completed"]),
});

export const PATCH = withAdmin(async (request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("events")
    .update({ status: parsed.data.status })
    .eq("id", getEventId())
    .select("*")
    .single<EventRow>();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({
    id: data.id,
    name: data.name,
    description: data.description,
    status: data.status,
  });
});
