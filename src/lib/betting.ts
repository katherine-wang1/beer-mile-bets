import type { Side } from "./types";

/**
 * Live implied probability for the Yes side. Returns 0.5 when both pools
 * are empty (no bets yet — show 50/50 by convention).
 */
export function yesProbability(yesPool: number, noPool: number): number {
  const total = yesPool + noPool;
  if (total === 0) return 0.5;
  return yesPool / total;
}

/**
 * What a user would receive (in Beer Bucks) if they bet `amount` on `side`
 * and that side wins, *assuming no further bets are placed*. This is the
 * "estimated payout" displayed in the bet form. Real payouts are computed
 * at resolution time and may differ if others bet after you.
 */
export function estimatedPayout(
  yesPool: number,
  noPool: number,
  side: Side,
  amount: number
): number {
  if (amount <= 0) return 0;
  const winningPool = side === "yes" ? yesPool + amount : noPool + amount;
  if (winningPool === 0) return 0;
  const totalPot = yesPool + noPool + amount;
  return Math.floor((amount / winningPool) * totalPot);
}

/**
 * Estimated profit (payout minus stake). Useful for "you'd win X" copy.
 */
export function estimatedProfit(
  yesPool: number,
  noPool: number,
  side: Side,
  amount: number
): number {
  return Math.max(estimatedPayout(yesPool, noPool, side, amount) - amount, 0);
}

export const MIN_BET = 5;
export const MAX_BET = 150;
