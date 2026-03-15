-- ============================================================================
-- DISCIPLINAS ESPIRITUAIS - Modelagem Supabase
-- Checklist privado que gera logs e XP na Jornada Espiritual.
-- ============================================================================

-- Tabela: Catálogo de disciplinas (diárias, semanais, mensais)
CREATE TABLE IF NOT EXISTS spiritual_disciplines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title_pt TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('daily', 'weekly', 'monthly')),
  xp_amount INTEGER NOT NULL DEFAULT 5,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: Logs de conclusão (cada check do usuário)
CREATE TABLE IF NOT EXISTS spiritual_discipline_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  discipline_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_awarded INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_discipline_completions_user_time ON spiritual_discipline_completions(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_discipline_completions_user_key ON spiritual_discipline_completions(user_id, discipline_key);

-- RLS: usuário só acessa seus próprios dados
ALTER TABLE spiritual_disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE spiritual_discipline_completions ENABLE ROW LEVEL SECURITY;

-- Disciplinas são somente leitura para todos autenticados
DROP POLICY IF EXISTS "Disciplines readable by authenticated" ON spiritual_disciplines;
CREATE POLICY "Disciplines readable by authenticated" ON spiritual_disciplines
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Completions: cada um vê/só insere os próprios
DROP POLICY IF EXISTS "Users own discipline completions" ON spiritual_discipline_completions;
CREATE POLICY "Users own discipline completions" ON spiritual_discipline_completions
  FOR ALL USING (auth.uid() = user_id);

-- Permitir action_type 'discipline' em spiritual_xp_events (alterar constraint).
-- Se o DROP falhar, verifique o nome da constraint: SELECT conname FROM pg_constraint WHERE conrelid = 'spiritual_xp_events'::regclass;
ALTER TABLE spiritual_xp_events DROP CONSTRAINT IF EXISTS spiritual_xp_events_action_type_check;
ALTER TABLE spiritual_xp_events ADD CONSTRAINT spiritual_xp_events_action_type_check
  CHECK (action_type IN ('devotional', 'prayer_register', 'event_checkin', 'reflection', 'discipline'));

-- Seed: disciplinas padrão
INSERT INTO spiritual_disciplines (key, title_pt, category, xp_amount, sort_order) VALUES
  ('reading', 'Leitura da Palavra', 'daily', 5, 1),
  ('prayer_secret', 'Secreto com Deus (oração pessoal)', 'daily', 5, 2),
  ('devotional_daily', 'Devocional diário', 'daily', 10, 3),
  ('gratitude', 'Agradeça a Deus por algo - Gratidão', 'daily', 5, 4),
  ('pray_for_someone', 'Orar por alguém', 'weekly', 10, 10),
  ('share_god', 'Falar de Deus para alguém', 'weekly', 10, 11),
  ('talk_brother', 'Conversar com algum irmão da Igreja', 'weekly', 10, 12),
  ('reflection_week', 'Reflexão espiritual da semana', 'weekly', 15, 13),
  ('fast', 'Jejum', 'monthly', 15, 20),
  ('bible_study', 'Estudo bíblico', 'monthly', 15, 21),
  ('service', 'Serviço', 'monthly', 15, 22),
  ('self_assessment', 'Autoavaliação espiritual', 'monthly', 15, 23)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE spiritual_disciplines IS 'Catálogo de disciplinas espirituais (diárias, semanais, mensais).';
COMMENT ON TABLE spiritual_discipline_completions IS 'Log de cada conclusão de disciplina por usuário; usado para checklist e para conceder XP.';
