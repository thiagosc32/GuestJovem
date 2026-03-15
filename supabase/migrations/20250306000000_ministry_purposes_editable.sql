-- Propósito do ministério editável (armazenado no banco; usa constante como padrão quando vazio).

CREATE TABLE IF NOT EXISTS ministry_purposes (
  ministry_key TEXT PRIMARY KEY,
  purpose TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE ministry_purposes IS 'Propósito customizado por ministério (editável pelo admin).';

ALTER TABLE ministry_purposes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ministry_purposes_select_authenticated" ON ministry_purposes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ministry_purposes_insert_authenticated" ON ministry_purposes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ministry_purposes_update_authenticated" ON ministry_purposes FOR UPDATE TO authenticated USING (true);
