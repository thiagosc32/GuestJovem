-- Presença em eventos: manter dados consultáveis mesmo após evento acabar ou ser excluído.
-- 1) Colunas de snapshot (nome e data do evento no momento do registro).
-- 2) FK event_id com ON DELETE SET NULL para não apagar presenças quando o evento for excluído.

-- Snapshot do evento no momento do check-in (para exibição após exclusão do evento)
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS event_title_snapshot text,
  ADD COLUMN IF NOT EXISTS event_date_snapshot text;

COMMENT ON COLUMN attendance_records.event_title_snapshot IS 'Título do evento no momento do registro (preservado se o evento for excluído).';
COMMENT ON COLUMN attendance_records.event_date_snapshot IS 'Data do evento no momento do registro (YYYY-MM-DD).';

-- Trocar FK de event_id para ON DELETE SET NULL (presenças permanecem consultáveis)
DO $$
DECLARE
  conname text;
BEGIN
  SELECT c.conname INTO conname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'attendance_records'
    AND c.contype = 'f'
    AND pg_get_constraintdef(c.oid) LIKE '%events%'
  LIMIT 1;

  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE attendance_records DROP CONSTRAINT %I', conname);
    EXECUTE 'ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_event_id_fkey
             FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL';
  END IF;
END $$;

-- Garantir RLS e permitir que admins excluam presenças (com confirmação no app)
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_records_select_authenticated" ON attendance_records;
CREATE POLICY "attendance_records_select_authenticated" ON attendance_records
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "attendance_records_insert_authenticated" ON attendance_records;
CREATE POLICY "attendance_records_insert_authenticated" ON attendance_records
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "attendance_records_delete_admin" ON attendance_records;
CREATE POLICY "attendance_records_delete_admin" ON attendance_records
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
