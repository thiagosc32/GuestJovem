-- Cronograma de eventos: etapas opcionais com responsável.

CREATE TABLE IF NOT EXISTS ministry_event_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES ministry_calendar_events(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL CHECK (step_type IN ('abertura', 'louvor', 'transicao', 'boas_vindas', 'ofertas', 'palavra', 'encerramento')),
  responsible_name TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, step_type)
);

CREATE INDEX IF NOT EXISTS idx_ministry_event_schedule_event ON ministry_event_schedule(event_id);

COMMENT ON TABLE ministry_event_schedule IS 'Cronograma por evento: abertura, louvor, transição, etc. com responsável.';

ALTER TABLE ministry_event_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ministry_event_schedule_select" ON ministry_event_schedule FOR SELECT TO authenticated USING (true);
CREATE POLICY "ministry_event_schedule_insert" ON ministry_event_schedule FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ministry_event_schedule_update" ON ministry_event_schedule FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ministry_event_schedule_delete" ON ministry_event_schedule FOR DELETE TO authenticated USING (true);
