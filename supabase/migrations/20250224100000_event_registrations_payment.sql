-- Tabela de inscrições em eventos (formulário); se não existir, criar.
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna payment_status se a tabela já existir sem ela
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_registrations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'payment_status') THEN
      ALTER TABLE event_registrations ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid'));
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_payment_status ON event_registrations(payment_status);

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_registrations_select" ON event_registrations;
CREATE POLICY "event_registrations_select" ON event_registrations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "event_registrations_insert" ON event_registrations;
CREATE POLICY "event_registrations_insert" ON event_registrations FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "event_registrations_update" ON event_registrations;
CREATE POLICY "event_registrations_update" ON event_registrations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
