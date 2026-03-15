-- Tabela principal de Ministérios (catálogo).
-- Permite que admins cadastrem, editem e excluam ministérios usados nas telas de tarefas, agenda e membros.

CREATE TABLE IF NOT EXISTS ministries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode listar ministérios
CREATE POLICY "ministries_select_authenticated" ON ministries
  FOR SELECT TO authenticated
  USING (true);

-- Apenas admins podem inserir
CREATE POLICY "ministries_insert_admin" ON ministries
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Apenas admins podem atualizar
CREATE POLICY "ministries_update_admin" ON ministries
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Apenas admins podem excluir
CREATE POLICY "ministries_delete_admin" ON ministries
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Seed inicial com os ministérios já existentes no app
INSERT INTO ministries (ministry_key, name, color, sort_order)
VALUES
  ('guest_fire', 'Guest Fire (Oração)', '#D32F2F', 1),
  ('organizacao', 'Organização', '#10B981', 2),
  ('criativo', 'Criativo', '#8B5CF6', 3),
  ('lideranca', 'Liderança', '#F59E0B', 4),
  ('midia', 'Mídia', '#EC4899', 5)
ON CONFLICT (ministry_key) DO NOTHING;

