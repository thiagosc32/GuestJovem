-- Agenda mensal: programações por data em cada ministério.

CREATE TABLE IF NOT EXISTS ministry_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_key TEXT NOT NULL,
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT,
  end_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ministry_calendar_events_ministry ON ministry_calendar_events(ministry_key);
CREATE INDEX IF NOT EXISTS idx_ministry_calendar_events_date ON ministry_calendar_events(ministry_key, event_date);

COMMENT ON TABLE ministry_calendar_events IS 'Programações da agenda mensal por ministério (calendário).';

ALTER TABLE ministry_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ministry_calendar_events_select" ON ministry_calendar_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "ministry_calendar_events_insert" ON ministry_calendar_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ministry_calendar_events_update" ON ministry_calendar_events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ministry_calendar_events_delete" ON ministry_calendar_events FOR DELETE TO authenticated USING (true);
