-- Permite action_type 'discipline' em spiritual_xp_events (disciplinas espirituais).
-- O app já usa awardXp(..., 'discipline', ...); o CHECK original pode não incluir 'discipline'.

DO $$
DECLARE
  conname text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'spiritual_xp_events') THEN
    RETURN;
  END IF;

  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'spiritual_xp_events'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%action_type%'
  LIMIT 1;

  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE spiritual_xp_events DROP CONSTRAINT %I', conname);
  END IF;

  EXECUTE 'ALTER TABLE spiritual_xp_events ADD CONSTRAINT spiritual_xp_events_action_type_check CHECK (action_type IN (''devotional'', ''prayer_register'', ''event_checkin'', ''reflection'', ''discipline''))';
END $$;
