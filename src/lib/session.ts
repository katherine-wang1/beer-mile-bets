import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import type { Role } from "./types";

export interface SessionData {
  userId?: string;
  displayName?: string;
  role?: Role;
}

const SEVEN_DAYS = 60 * 60 * 24 * 7;

function getSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET is missing or shorter than 32 chars. Generate with `openssl rand -base64 32`."
    );
  }
  return {
    cookieName: "bmb_session",
    password,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: SEVEN_DAYS,
      path: "/",
    },
  };
}

/**
 * Read the session for the current request. Returns an object that may have
 * undefined fields if the user is not authenticated. Has a .save() method.
 */
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

/**
 * Returns the session if the user is authenticated, otherwise null.
 * Use this in API routes — pair with `withAuth` for cleaner handlers.
 */
export async function getCurrentUser(): Promise<{
  userId: string;
  displayName: string;
  role: Role;
} | null> {
  const session = await getSession();
  if (!session.userId || !session.displayName || !session.role) return null;
  return {
    userId: session.userId,
    displayName: session.displayName,
    role: session.role,
  };
}
