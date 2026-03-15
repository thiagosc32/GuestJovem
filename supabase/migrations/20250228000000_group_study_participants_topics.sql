-- Participantes: quem participa de cada estudo. Apenas participantes podem criar tópicos e comentar.
CREATE TABLE IF NOT EXISTS group_study_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES group_studies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(study_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_study_participants_study ON group_study_participants(study_id);
CREATE INDEX IF NOT EXISTS idx_group_study_participants_user ON group_study_participants(user_id);

ALTER TABLE group_study_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants_select_authenticated"
  ON group_study_participants FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "participants_insert_own"
  ON group_study_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "participants_delete_own"
  ON group_study_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Tópicos de debate dentro do estudo
CREATE TABLE IF NOT EXISTS group_study_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES group_studies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_study_topics_study ON group_study_topics(study_id);
CREATE INDEX IF NOT EXISTS idx_group_study_topics_created ON group_study_topics(created_at DESC);

ALTER TABLE group_study_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topics_select_authenticated"
  ON group_study_topics FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "topics_insert_own"
  ON group_study_topics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "topics_update_own"
  ON group_study_topics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "topics_delete_own"
  ON group_study_topics FOR DELETE
  USING (auth.uid() = user_id);

-- Respostas aos tópicos
CREATE TABLE IF NOT EXISTS group_study_topic_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES group_study_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topic_replies_topic ON group_study_topic_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_replies_created ON group_study_topic_replies(created_at ASC);

ALTER TABLE group_study_topic_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topic_replies_select_authenticated"
  ON group_study_topic_replies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "topic_replies_insert_own"
  ON group_study_topic_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "topic_replies_update_own"
  ON group_study_topic_replies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "topic_replies_delete_own"
  ON group_study_topic_replies FOR DELETE
  USING (auth.uid() = user_id);

-- Insere o criador como participante em estudos existentes (e futuros via trigger)
CREATE OR REPLACE FUNCTION group_study_auto_add_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO group_study_participants (study_id, user_id)
  VALUES (NEW.id, NEW.user_id)
  ON CONFLICT (study_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_group_study_auto_add_creator ON group_studies;
CREATE TRIGGER trg_group_study_auto_add_creator
  AFTER INSERT ON group_studies
  FOR EACH ROW EXECUTE PROCEDURE group_study_auto_add_creator();

-- Backfill: adiciona criadores de estudos existentes como participantes
INSERT INTO group_study_participants (study_id, user_id)
SELECT id, user_id FROM group_studies
ON CONFLICT (study_id, user_id) DO NOTHING;

COMMENT ON TABLE group_study_participants IS 'Usuários que participam do estudo - apenas eles podem criar tópicos e responder';
COMMENT ON TABLE group_study_topics IS 'Tópicos de debate dentro do estudo';
COMMENT ON TABLE group_study_topic_replies IS 'Respostas aos tópicos de debate';
