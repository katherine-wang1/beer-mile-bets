export type Role = "participant" | "admin";

export type EventStatus = "upcoming" | "active" | "completed";

export type MarketStatus = "open" | "locked" | "resolved" | "voided";

export type Side = "yes" | "no";

export interface UserRow {
  id: string;
  first_name: string;
  last_initial: string;
  nickname: string | null;
  pin_hash: string;
  beer_bucks: number;
  role: Role;
  created_at: string;
}

export interface MeProfile {
  id: string;
  displayName: string;
  beerBucks: number;
  role: Role;
}

export interface EventRow {
  id: string;
  name: string;
  description: string | null;
  status: EventStatus;
  created_at: string;
}

export interface CategoryRow {
  id: string;
  event_id: string;
  name: string;
  emoji: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
}

export interface MarketRow {
  id: string;
  event_id: string;
  category_id: string;
  created_by: string;
  question: string;
  resolution_criteria: string;
  closing_time: string | null;
  status: MarketStatus;
  yes_pool: number;
  no_pool: number;
  resolved_outcome: Side | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  created_at: string;
}

export interface TradeRow {
  id: string;
  market_id: string;
  user_id: string;
  side: Side;
  amount: number;
  created_at: string;
}

// API response shapes (camelCase, distinct from DB rows)

export interface MarketListItem {
  id: string;
  question: string;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string | null;
  status: MarketStatus;
  yesPool: number;
  noPool: number;
  yesProbability: number;
  closingTime: string | null;
  totalVolume: number;
  createdById: string;
  createdByDisplayName: string;
  createdAt: string;
}

export interface MarketDetail extends MarketListItem {
  resolutionCriteria: string;
  resolvedOutcome: Side | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  myTrades: Array<{
    id: string;
    side: Side;
    amount: number;
    createdAt: string;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  beerBucks: number;
  isMe: boolean;
}
