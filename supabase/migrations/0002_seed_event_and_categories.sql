-- 0002_seed_event_and_categories.sql
-- Seeds the single event row and the default categories.
-- Run after 0001_initial_schema.sql.
--
-- After this runs, capture the event id with:
--   SELECT id FROM events;
-- and put it in NEXT_PUBLIC_EVENT_ID.

DO $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Insert (or skip if already present) the single event row.
  SELECT id INTO v_event_id FROM events LIMIT 1;
  IF v_event_id IS NULL THEN
    INSERT INTO events (name, description, status)
    VALUES (
      'Beer Mile 2026',
      'Friends and classmates Beer Mile event. Place bets, watch odds move, win Beer Bucks.',
      'upcoming'
    )
    RETURNING id INTO v_event_id;
  END IF;

  -- Default categories. Skip if already seeded.
  INSERT INTO categories (event_id, name, emoji, is_default)
  SELECT v_event_id, name, emoji, true
  FROM (VALUES
    ('Winner',              '🏆'),
    ('Vomit / Penalty Lap', '🤮'),
    ('Finishing Time',      '⏱'),
    ('Beer Performance',    '🍺'),
    ('Misc / Custom',       '🎲')
  ) AS defaults(name, emoji)
  WHERE NOT EXISTS (
    SELECT 1 FROM categories
    WHERE event_id = v_event_id
      AND categories.name = defaults.name
      AND categories.is_default = true
  );
END $$;
