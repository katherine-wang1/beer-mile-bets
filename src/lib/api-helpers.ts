import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "./session";
import { getSupabaseServer } from "./supabase-server";
import type { Role } from "./types";

export interface AuthedUser {
  userId: string;
  displayName: string;
  role: Role;
}

export function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

/**
 * Wrap a route handler so the user must be authenticated. The handler
 * receives the resolved `AuthedUser` as its second argument.
 */
export function withAuth<TContext = unknown>(
  handler: (
    request: Request,
    user: AuthedUser,
    context: TContext
  ) => Promise<Response> | Response
) {
  return async (request: Request, context: TContext) => {
    const user = await getCurrentUser();
    if (!user) return jsonError("Not authenticated", 401);
    return handler(request, user, context);
  };
}

/**
 * Like `withAuth` but additionally requires admin role.
 * Authorizes against the database so session role cannot drift from `users.role`
 * (e.g. after promoting an account without signing in again).
 */
export function withAdmin<TContext = unknown>(
  handler: (
    request: Request,
    user: AuthedUser,
    context: TContext
  ) => Promise<Response> | Response
) {
  return async (request: Request, context: TContext) => {
    const user = await getCurrentUser();
    if (!user) return jsonError("Not authenticated", 401);

    const supabase = getSupabaseServer();
    const { data: row, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.userId)
      .maybeSingle<{ role: Role }>();

    if (error) return jsonError(error.message, 500);
    if (!row || row.role !== "admin") return jsonError("Forbidden", 403);

    const adminUser: AuthedUser = { ...user, role: row.role };
    return handler(request, adminUser, context);
  };
}

/**
 * Map Postgres error codes from our betting functions to HTTP statuses.
 */
export function mapPgError(error: { code?: string; message?: string }): {
  status: number;
  message: string;
} {
  switch (error.code) {
    case "P0001":
      return { status: 409, message: "Market is not open for betting." };
    case "P0002":
      return { status: 403, message: "You can't bet on a market you created." };
    case "P0003":
      return { status: 400, message: error.message ?? "Invalid bet." };
    case "P0004":
      return { status: 400, message: "You don't have enough Beer Bucks." };
    case "P0005":
      return { status: 404, message: "Not found." };
    case "P1001":
      return { status: 404, message: "Market not found." };
    case "P1002":
      return { status: 409, message: "Market has already been resolved." };
    case "P1003":
      return { status: 400, message: "Invalid resolution outcome." };
    default:
      return { status: 500, message: error.message ?? "Internal error." };
  }
}
