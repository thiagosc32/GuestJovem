-- ============================================================================
-- JORNADA ESPIRITAL - Modelagem Supabase
-- Progresso pessoal por XP, sem ranking público. Foco em constância.
--
-- Como aplicar: no painel do Supabase, abra SQL Editor e execute este script
-- (ou crie uma migration se usar Supabase CLI).
-- ============================================================================

-- Tabela: Perfil da jornada espiritual (um por usuário)
CREATE TABLE IF NOT EXISTS spiritual_journey_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  streak_weeks INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  last_streak_week_start DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela: Eventos de XP (auditoria e controle de limite diário / 1x por dia)
CREATE TABLE IF NOT EXISTS spiritual_xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('devotional', 'prayer_register', 'event_checkin', 'reflection', 'discipline')),
  xp_amount INTEGER NOT NULL,
  reference_id TEXT,
  reference_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela: Reflexões espirituais (escrita de reflexão - gera XP 1x/dia)
CREATE TABLE IF NOT EXISTS spiritual_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas frequentes (evitar expressões com ::date - não são IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_spiritual_journey_profiles_user ON spiritual_journey_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_spiritual_xp_events_user_created ON spiritual_xp_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_spiritual_xp_events_user_action_created ON spiritual_xp_events(user_id, action_type, created_at);
CREATE INDEX IF NOT EXISTS idx_spiritual_reflections_user ON spiritual_reflections(user_id);

-- RLS: cada usuário só acessa seus próprios dados (sem ranking público)
ALTER TABLE spiritual_journey_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spiritual_xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE spiritual_reflections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own journey profile" ON spiritual_journey_profiles;
CREATE POLICY "Users own journey profile" ON spiritual_journey_profiles
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own xp events" ON spiritual_xp_events;
CREATE POLICY "Users own xp events" ON spiritual_xp_events
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own reflections" ON spiritual_reflections;
CREATE POLICY "Users own reflections" ON spiritual_reflections
  FOR ALL USING (auth.uid() = user_id);

-- Trigger para updated_at no perfil
CREATE OR REPLACE FUNCTION update_spiritual_journey_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS spiritual_journey_profiles_updated_at ON spiritual_journey_profiles;
CREATE TRIGGER spiritual_journey_profiles_updated_at
  BEFORE UPDATE ON spiritual_journey_profiles
  FOR EACH ROW EXECUTE FUNCTION update_spiritual_journey_updated_at();

-- Comentários
COMMENT ON TABLE spiritual_journey_profiles IS 'Progresso da jornada espiritual por usuário (XP total, nível, streak).';
COMMENT ON TABLE spiritual_xp_events IS 'Registro de cada ação que concedeu XP (para limite diário e 1x/dia por tipo).';
COMMENT ON TABLE spiritual_reflections IS 'Reflexões espirituais escritas pelo usuário (uma por dia gera XP).';
