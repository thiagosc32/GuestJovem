-- Sistema de visitantes: presença sem exigir conta
-- Modo 1: Visitante rápido (sem perfil)
-- Modo 2: Visitante identificado (visitor_profile)
-- Modo 3: Visitante → membro (transição futura)

-- Perfis de visitantes (quem opta por "salvar nome" nas próximas vezes)
CREATE TABLE IF NOT EXISTS visitor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  qr_code_token TEXT UNIQUE, -- para Modo 2: QR temporário para presenças
  visit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitor_profiles_qr_token ON visitor_profiles(qr_code_token);

-- Presenças de visitantes em eventos (sem user_id)
CREATE TABLE IF NOT EXISTS event_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  visitor_profile_id UUID REFERENCES visitor_profiles(id) ON DELETE SET NULL,
  name TEXT, -- nome informado na hora (Modo 1) ou null se vinculado a visitor_profile
  is_first_time BOOLEAN NOT NULL DEFAULT true,
  contact_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_visitors_event_id ON event_visitors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_visitors_visitor_profile ON event_visitors(visitor_profile_id);
CREATE INDEX IF NOT EXISTS idx_event_visitors_created ON event_visitors(created_at);

COMMENT ON TABLE event_visitors IS 'Presença de visitantes em eventos (sem conta de usuário)';
COMMENT ON TABLE visitor_profiles IS 'Perfis leves de visitantes recorrentes (não é conta de login)';

-- RLS: admins podem tudo; authenticated podem inserir (para fluxo visitante no app)
ALTER TABLE visitor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_visitors ENABLE ROW LEVEL SECURITY;

-- Inserção aberta para visitante (fluxo público do check-in)
CREATE POLICY "event_visitors_insert_allow" ON event_visitors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "event_visitors_select_authenticated" ON event_visitors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "event_visitors_select_service" ON event_visitors
  FOR SELECT USING (true);

-- Admins e authenticated podem ver visitor_profiles
CREATE POLICY "visitor_profiles_select" ON visitor_profiles
  FOR SELECT USING (true);

CREATE POLICY "visitor_profiles_insert" ON visitor_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "visitor_profiles_update" ON visitor_profiles
  FOR UPDATE USING (true);

-- Atualiza visit_count e updated_at em visitor_profiles ao inserir presença
CREATE OR REPLACE FUNCTION increment_visitor_visit_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visitor_profile_id IS NOT NULL THEN
    UPDATE visitor_profiles
    SET visit_count = visit_count + 1,
        updated_at = now()
    WHERE id = NEW.visitor_profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_visitors_increment_visit_count
  AFTER INSERT ON event_visitors
  FOR EACH ROW
  EXECUTE FUNCTION increment_visitor_visit_count();

-- Permitir que visitantes (anon) leiam evento para exibir nome no check-in
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_select_public" ON events;
CREATE POLICY "events_select_public" ON events FOR SELECT USING (true);
