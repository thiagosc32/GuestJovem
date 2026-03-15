-- Tabela de definições de conquistas (admin cria/edita)
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  progress_key TEXT NOT NULL,
  max_progress INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achievement_definitions_active ON achievement_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_sort ON achievement_definitions(sort_order);

ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

-- Admins e usuários autenticados podem ler definições ativas
DROP POLICY IF EXISTS "Achievement definitions readable by authenticated" ON achievement_definitions;
CREATE POLICY "Achievement definitions readable by authenticated" ON achievement_definitions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas admins podem inserir/atualizar/excluir
DROP POLICY IF EXISTS "Only admins manage achievement definitions" ON achievement_definitions;
CREATE POLICY "Only admins manage achievement definitions" ON achievement_definitions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed: conquistas padrão
INSERT INTO achievement_definitions (title, description, icon, progress_key, max_progress, sort_order) VALUES
  ('7 dias de oração', 'Orou consecutivos por 7 dias', 'flame', 'prayer_streak', 7, 1),
  ('Primeiro plano bíblico', 'Concluiu seu primeiro plano de leitura', 'book', 'bible_plans_completed', 1, 2),
  ('Jejum concluído', 'Completou um jejum nas disciplinas espirituais', 'dove', 'fast_completed', 1, 3),
  ('7 dias de devocional', 'Leu devocional 7 dias consecutivos', 'book-open', 'devotional_streak', 7, 4),
  ('5 eventos participados', 'Confirmou presença em 5 eventos', 'calendar', 'event_checkins', 5, 5),
  ('10 reflexões', 'Registrou 10 reflexões espirituais', 'pen-line', 'reflections_count', 10, 6),
  ('Primeiro post', 'Publicou seu primeiro post na comunidade', 'message-circle', 'community_posts', 1, 7),
  ('7 dias de disciplinas', 'Marcou pelo menos uma disciplina por 7 dias', 'list-checks', 'disciplines_streak', 7, 8)
;
