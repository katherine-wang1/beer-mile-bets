-- 0001_initial_schema.sql
-- Beer Mile Bets — initial schema
-- Run this first in the Supabase SQL editor.

-- gen_random_uuid() lives in pgcrypto, which Supabase enables by default.

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    TEXT NOT NULL,
  last_initial  CHAR(1) NOT NULL,
  nickname      TEXT,
  pin_hash      TEXT NOT NULL,
  beer_bucks    INTEGER NOT NULL DEFAULT 500,
  role          TEXT NOT NULL DEFAULT 'participant'
                CHECK (role IN ('participant', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Make (first_name, last_initial, nickname) unique. NULLs are treated as
-- distinct by default, which is what we want — "Chris M." (no nickname) is
-- a single account, but "Chris M. (cmac)" is a separate account.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_identity
  ON users (first_name, last_initial, nickname);
-- Also enforce uniqueness when nickname IS NULL (NULLs are otherwise treated
-- as distinct in regular unique indexes prior to PG15 NULLS NOT DISTINCT).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_identity_no_nickname
  ON users (first_name, last_initial)
  WHERE nickname IS NULL;

CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'upcoming'
              CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  emoji       TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS markets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_id         UUID NOT NULL REFERENCES categories(id),
  created_by          UUID NOT NULL REFERENCES users(id),
  question            TEXT NOT NULL,
  resolution_criteria TEXT NOT NULL,
  closing_time        TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'locked', 'resolved', 'voided')),
  yes_pool            INTEGER NOT NULL DEFAULT 0 CHECK (yes_pool >= 0),
  no_pool             INTEGER NOT NULL DEFAULT 0 CHECK (no_pool >= 0),
  resolved_outcome    TEXT CHECK (resolved_outcome IN ('yes', 'no')),
  resolved_at         TIMESTAMPTZ,
  resolved_by         UUID REFERENCES users(id),
  resolution_note     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trades (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id   UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  side        TEXT NOT NULL CHECK (side IN ('yes', 'no')),
  amount      INTEGER NOT NULL CHECK (amount >= 5 AND amount <= 150),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_markets_event_id    ON markets(event_id);
CREATE INDEX IF NOT EXISTS idx_markets_status      ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_category_id ON markets(category_id);
CREATE INDEX IF NOT EXISTS idx_trades_market_id    ON trades(market_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id      ON trades(user_id);

-- Enable Realtime broadcast for the markets table.
-- This is critical: without it, the live odds feed will silently not work.
ALTER PUBLICATION supabase_realtime ADD TABLE markets;
