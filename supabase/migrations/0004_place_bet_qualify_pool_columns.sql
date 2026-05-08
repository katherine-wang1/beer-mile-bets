-- Fix "column reference yes_pool is ambiguous" in place_bet.
-- RETURNS TABLE (yes_pool, no_pool, ...) shadows markets columns in PL/pgSQL.

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
  SELECT * INTO v_market FROM markets WHERE id = p_market_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'market_not_found' USING ERRCODE = 'P0005';
  END IF;

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

  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0005';
  END IF;
  IF v_user.beer_bucks < p_amount THEN
    RAISE EXCEPTION 'insufficient_balance' USING ERRCODE = 'P0004';
  END IF;

  UPDATE users SET beer_bucks = beer_bucks - p_amount WHERE id = p_user_id;

  IF p_side = 'yes' THEN
    UPDATE markets SET yes_pool = markets.yes_pool + p_amount WHERE id = p_market_id;
  ELSE
    UPDATE markets SET no_pool = markets.no_pool + p_amount WHERE id = p_market_id;
  END IF;

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
