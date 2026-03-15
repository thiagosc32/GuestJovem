-- Estudos em grupo: usuários podem iniciar estudos sobre temas ou livros específicos com comentários e interação.
CREATE TABLE IF NOT EXISTS group_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  theme TEXT NOT NULL,
  book_reference TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_studies_created_at ON group_studies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_studies_user_id ON group_studies(user_id);

ALTER TABLE group_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_studies_select_authenticated"
  ON group_studies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "group_studies_insert_own"
  ON group_studies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group_studies_update_own"
  ON group_studies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "group_studies_delete_own"
  ON group_studies FOR DELETE
  USING (auth.uid() = user_id);

-- Comentários nos estudos em grupo
CREATE TABLE IF NOT EXISTS group_study_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES group_studies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_study_comments_study_id ON group_study_comments(study_id);
CREATE INDEX IF NOT EXISTS idx_group_study_comments_created_at ON group_study_comments(created_at ASC);

ALTER TABLE group_study_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_study_comments_select"
  ON group_study_comments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "group_study_comments_insert_own"
  ON group_study_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group_study_comments_update_own"
  ON group_study_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "group_study_comments_delete_own"
  ON group_study_comments FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE group_studies IS 'Estudos em grupo criados por usuários - temas ou livros bíblicos com espaço para comentários';
COMMENT ON TABLE group_study_comments IS 'Comentários e interações nos estudos em grupo';
