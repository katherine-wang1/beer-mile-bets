import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Returns a Supabase client authenticated with the SERVICE ROLE key.
 * This bypasses Row Level Security and must NEVER be exposed to the browser.
 * Use this in API routes and server components only.
 */
export function getSupabaseServer(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase env vars. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  cached = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: { schema: "public" },
  });

  return cached;
}

export function getEventId(): string {
  const id = process.env.NEXT_PUBLIC_EVENT_ID;
  if (!id) {
    throw new Error(
      "NEXT_PUBLIC_EVENT_ID is not set. Run `SELECT id FROM events;` in Supabase and add the result to .env.local."
    );
  }
  return id;
}
