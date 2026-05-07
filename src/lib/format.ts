import type { UserRow } from "./types";

export function displayName(
  user: Pick<UserRow, "first_name" | "last_initial" | "nickname">
): string {
  const base = `${user.first_name} ${user.last_initial}.`;
  return user.nickname ? `${base} (${user.nickname})` : base;
}

export function formatBucks(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatProbability(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function timeUntil(iso: string | null): string {
  if (!iso) return "no deadline";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h left`;
  const days = Math.round(hours / 24);
  return `${days}d left`;
}
