-- 0003_betting_functions.sql
-- Atomic betting functions invoked via supabase.rpc(...).
-- Each function runs in an implicit transaction; we use SELECT ... FOR UPDATE
-- on the rows we mutate to prevent races between concurrent bets.

-- =============================================================
-- place_bet
--
-- Performs lazy lock + all validation + the bet in a single atomic
-- operation. Returns the updated market and the user's new balance.
--
-- Errors are raised with custom codes so the API layer can map them
-- to clean HTTP responses:
--   P0001  market_not_open       -> 409
--   P0002  creator_cannot_bet    -> 403
--   P0003  invalid_amount        -> 400
--   P0004  insufficient_balance  -> 400
--   P0005  market_not_found      -> 404
-- =============================================================
CREATE OR REPLACE FUNCTION place_bet(
  p_market_id UUID,
  p_user_id   UUID,
  p_side      TEXT,
  p_amount    INTEGER
)
RETURNS TABLE (
  trade_id     UUID,
  new_balance  INTEGER,
  yes_pool     INTEGER,
  no_pool      INTEGER,
  market_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_market   markets%ROWTYPE;
  v_user     users%ROWTYPE;
  v_trade_id UUID;
BEGIN
  -- Lock the market row first.
  SELECT * INTO v_market FROM markets WHERE id = p_market_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'market_not_found' USING ERRCODE = 'P0005';
  END IF;

  -- Lazy lock: if closing_time is past and status is still 'open', flip it.
  IF v_market.status = 'open'
     AND v_market.closing_time IS NOT NULL
     AND v_market.closing_time <= now() THEN
    UPDATE markets SET status = 'locked' WHERE id = p_market_id;
    v_market.status := 'locked';
  END IF;

  IF v_market.status <> 'open' THEN
    RAISE EXCEPTION 'market_not_open' USING ERRCODE = 'P0001';
  END IF;

  IF v_market.created_by = p_user_id THEN
    RAISE EXCEPTION 'creator_cannot_bet' USING ERRCODE = 'P0002';
  END IF;

  IF p_side NOT IN ('yes', 'no') THEN
    RAISE EXCEPTION 'invalid_side' USING ERRCODE = 'P0003';
  END IF;

  IF p_amount < 5 OR p_amount > 150 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0003';
  END IF;

  -- Lock the user row and check balance.
  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0005';
  END IF;
  IF v_user.beer_bucks < p_amount THEN
    RAISE EXCEPTION 'insufficient_balance' USING ERRCODE = 'P0004';
  END IF;

  -- Decrement balance.
  UPDATE users SET beer_bucks = beer_bucks - p_amount WHERE id = p_user_id;

  -- Bump the appropriate pool. Qualify columns as markets.yes_pool because
  -- RETURNS TABLE (yes_pool, no_pool, ...) defines homonymous variables that
  -- would otherwise make yes_pool / no_pool ambiguous in UPDATE expressions.
  IF p_side = 'yes' THEN
    UPDATE markets SET yes_pool = markets.yes_pool + p_amount WHERE id = p_market_id;
  ELSE
    UPDATE markets SET no_pool = markets.no_pool + p_amount WHERE id = p_market_id;
  END IF;

  -- Insert the trade.
  INSERT INTO trades (market_id, user_id, side, amount)
  VALUES (p_market_id, p_user_id, p_side, p_amount)
  RETURNING id INTO v_trade_id;

  RETURN QUERY
    SELECT
      v_trade_id,
      v_user.beer_bucks - p_amount,
      m.yes_pool,
      m.no_pool,
      m.status
    FROM markets m
    WHERE m.id = p_market_id;
END;
$$;


-- =============================================================
-- resolve_market
--
-- Marks a market as resolved with the given outcome and distributes
-- payouts proportionally to winning-side traders. Uses FLOOR so we
-- never create Beer Bucks from rounding (any 1-buck remainder stays
-- undistributed).
--
-- Errors:
--   P1001  market_not_found       -> 404
--   P1002  market_already_resolved -> 409
--   P1003  invalid_outcome        -> 400
-- =============================================================
CREATE OR REPLACE FUNCTION resolve_market(
  p_market_id UUID,
  p_outcome   TEXT,
  p_note      TEXT,
  p_admin_id  UUID
)
RETURNS markets
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_market    markets%ROWTYPE;
  v_total_pot INTEGER;
  v_winning_pool INTEGER;
  v_trade RECORD;
  v_payout INTEGER;
BEGIN
  IF p_outcome NOT IN ('yes', 'no') THEN
    RAISE EXCEPTION 'invalid_outcome' USING ERRCODE = 'P1003';
  END IF;

  SELECT * INTO v_market FROM markets WHERE id = p_market_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'market_not_found' USING ERRCODE = 'P1001';
  END IF;

  IF v_market.status IN ('resolved', 'voided') THEN
    RAISE EXCEPTION 'market_already_resolved' USING ERRCODE = 'P1002';
  END IF;

  v_total_pot    := v_market.yes_pool + v_market.no_pool;
  v_winning_pool := CASE WHEN p_outcome = 'yes' THEN v_market.yes_pool ELSE v_market.no_pool END;

  -- Distribute payouts only when the winning pool has any wagers.
  IF v_winning_pool > 0 THEN
    FOR v_trade IN
      SELECT user_id, amount
      FROM trades
      WHERE market_id = p_market_id AND side = p_outcome
      FOR UPDATE
    LOOP
      v_payout := FLOOR((v_trade.amount::numeric / v_winning_pool) * v_total_pot)::int;
      IF v_payout > 0 THEN
        UPDATE users SET beer_bucks = beer_bucks + v_payout WHERE id = v_trade.user_id;
      END IF;
    END LOOP;
  END IF;

  UPDATE markets
    SET status           = 'resolved',
        resolved_outcome = p_outcome,
        resolved_at      = now(),
        resolved_by      = p_admin_id,
        resolution_note  = p_note
    WHERE id = p_market_id
    RETURNING * INTO v_market;

  RETURN v_market;
END;
$$;


-- =============================================================
-- void_market
--
-- Refunds every trade in full and marks the market voided.
-- Errors mirror resolve_market.
-- =============================================================
CREATE OR REPLACE FUNCTION void_market(
  p_market_id UUID,
  p_admin_id  UUID,
  p_note      TEXT DEFAULT NULL
)
RETURNS markets
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_market markets%ROWTYPE;
  v_trade RECORD;
BEGIN
  SELECT * INTO v_market FROM markets WHERE id = p_market_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'market_not_found' USING ERRCODE = 'P1001';
  END IF;

  IF v_market.status IN ('resolved', 'voided') THEN
    RAISE EXCEPTION 'market_already_resolved' USING ERRCODE = 'P1002';
  END IF;

  FOR v_trade IN
    SELECT user_id, amount
    FROM trades
    WHERE market_id = p_market_id
    FOR UPDATE
  LOOP
    UPDATE users SET beer_bucks = beer_bucks + v_trade.amount WHERE id = v_trade.user_id;
  END LOOP;

  UPDATE markets
    SET status           = 'voided',
        resolved_at      = now(),
        resolved_by      = p_admin_id,
        resolution_note  = COALESCE(p_note, 'Market voided')
    WHERE id = p_market_id
    RETURNING * INTO v_market;

  RETURN v_market;
END;
$$;


-- =============================================================
-- lock_market
--
-- Manually lock an open market (admin action).
-- Idempotent: locking an already-locked market succeeds silently.
-- =============================================================
CREATE OR REPLACE FUNCTION lock_market(p_market_id UUID)
RETURNS markets
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_market markets%ROWTYPE;
BEGIN
  SELECT * INTO v_market FROM markets WHERE id = p_market_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'market_not_found' USING ERRCODE = 'P1001';
  END IF;
  IF v_market.status IN ('resolved', 'voided') THEN
    RAISE EXCEPTION 'market_already_resolved' USING ERRCODE = 'P1002';
  END IF;
  IF v_market.status = 'open' THEN
    UPDATE markets SET status = 'locked' WHERE id = p_market_id RETURNING * INTO v_market;
  END IF;
  RETURN v_market;
END;
$$;


-- =============================================================
-- lock_all_open_markets
--
-- Bulk lock for race-start convenience. Returns count locked.
-- =============================================================
CREATE OR REPLACE FUNCTION lock_all_open_markets(p_event_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH locked AS (
    UPDATE markets
       SET status = 'locked'
     WHERE event_id = p_event_id
       AND status   = 'open'
     RETURNING 1
  )
  SELECT count(*) INTO v_count FROM locked;
  RETURN v_count;
END;
$$;
