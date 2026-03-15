-- Ministérios: tarefas, agenda mensal e membros por ministério (admin).

CREATE TABLE IF NOT EXISTS ministry_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  is_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ministry_tasks_ministry_key ON ministry_tasks(ministry_key);
CREATE INDEX IF NOT EXISTS idx_ministry_tasks_due_date ON ministry_tasks(due_date);

COMMENT ON TABLE ministry_tasks IS 'Tarefas e responsabilidades por ministério (Guest Fire, Organização, etc.)';

CREATE TABLE IF NOT EXISTS ministry_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_key TEXT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ministry_agenda_ministry_key ON ministry_agenda(ministry_key);
CREATE INDEX IF NOT EXISTS idx_ministry_agenda_month_year ON ministry_agenda(ministry_key, year, month);

COMMENT ON TABLE ministry_agenda IS 'Agenda mensal por ministério';

CREATE TABLE IF NOT EXISTS ministry_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ministry_key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ministry_members_ministry_key ON ministry_members(ministry_key);

COMMENT ON TABLE ministry_members IS 'Membros por ministério';

ALTER TABLE ministry_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ministry_tasks_select_authenticated" ON ministry_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "ministry_tasks_insert_authenticated" ON ministry_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ministry_tasks_update_authenticated" ON ministry_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ministry_tasks_delete_authenticated" ON ministry_tasks FOR DELETE TO authenticated USING (true);

CREATE POLICY "ministry_agenda_select_authenticated" ON ministry_agenda FOR SELECT TO authenticated USING (true);
CREATE POLICY "ministry_agenda_insert_authenticated" ON ministry_agenda FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ministry_agenda_update_authenticated" ON ministry_agenda FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ministry_agenda_delete_authenticated" ON ministry_agenda FOR DELETE TO authenticated USING (true);

CREATE POLICY "ministry_members_select_authenticated" ON ministry_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "ministry_members_insert_authenticated" ON ministry_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ministry_members_update_authenticated" ON ministry_members FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ministry_members_delete_authenticated" ON ministry_members FOR DELETE TO authenticated USING (true);
