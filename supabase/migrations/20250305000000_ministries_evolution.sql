-- Evolução do Gerenciador de Ministérios: tarefas, foco mensal e membros.
-- https://docs exigem: propósito fixo (app), tarefas evoluídas, foco do mês, membros evoluídos.

-- 1. MINISTRY_TASKS: novos campos (tipo, frequência, prioridade, responsável, apoio, status)
ALTER TABLE ministry_tasks ADD COLUMN IF NOT EXISTS task_type TEXT CHECK (task_type IN ('pontual', 'recorrente') OR task_type IS NULL);
ALTER TABLE ministry_tasks ADD COLUMN IF NOT EXISTS frequency TEXT CHECK (frequency IN ('diaria', 'semanal', 'mensal') OR frequency IS NULL);
ALTER TABLE ministry_tasks ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('baixa', 'media', 'alta') OR priority IS NULL);
ALTER TABLE ministry_tasks ADD COLUMN IF NOT EXISTS responsible_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ministry_tasks ADD COLUMN IF NOT EXISTS support_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ministry_tasks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida'));

CREATE INDEX IF NOT EXISTS idx_ministry_tasks_status ON ministry_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ministry_tasks_priority ON ministry_tasks(priority);

-- 2. MINISTRY_MONTHLY_FOCUS: substitui agenda múltipla por um foco por mês
CREATE TABLE IF NOT EXISTS ministry_monthly_focus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_key TEXT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL,
  theme TEXT NOT NULL,
  objective TEXT,
  base_verse TEXT,
  practical_direction TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(ministry_key, year, month)
);

CREATE INDEX IF NOT EXISTS idx_ministry_monthly_focus_key ON ministry_monthly_focus(ministry_key);
CREATE INDEX IF NOT EXISTS idx_ministry_monthly_focus_month_year ON ministry_monthly_focus(ministry_key, year, month);

COMMENT ON TABLE ministry_monthly_focus IS 'Foco do mês por ministério: tema, objetivo, versículo e direção prática.';

ALTER TABLE ministry_monthly_focus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ministry_monthly_focus_select_authenticated" ON ministry_monthly_focus FOR SELECT TO authenticated USING (true);
CREATE POLICY "ministry_monthly_focus_insert_authenticated" ON ministry_monthly_focus FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ministry_monthly_focus_update_authenticated" ON ministry_monthly_focus FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ministry_monthly_focus_delete_authenticated" ON ministry_monthly_focus FOR DELETE TO authenticated USING (true);

-- 3. MINISTRY_MEMBERS: novos campos (função, nível de envolvimento, data de entrada, observação privada)
ALTER TABLE ministry_members ADD COLUMN IF NOT EXISTS function TEXT;
ALTER TABLE ministry_members ADD COLUMN IF NOT EXISTS involvement_level TEXT CHECK (involvement_level IN ('apoio', 'ativo', 'lideranca') OR involvement_level IS NULL);
ALTER TABLE ministry_members ADD COLUMN IF NOT EXISTS entry_date DATE;
ALTER TABLE ministry_members ADD COLUMN IF NOT EXISTS private_note TEXT;

-- Manter ministry_agenda para retrocompatibilidade (pode ser deprecada depois). App usará ministry_monthly_focus.
