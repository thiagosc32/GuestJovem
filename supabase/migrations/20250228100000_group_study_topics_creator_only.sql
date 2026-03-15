-- Apenas o criador do estudo pode criar tópicos
DROP POLICY IF EXISTS "topics_insert_own" ON group_study_topics;

CREATE POLICY "topics_insert_creator_only"
  ON group_study_topics FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM group_studies gs
      WHERE gs.id = study_id AND gs.user_id = auth.uid()
    )
  );

COMMENT ON TABLE group_study_topics IS 'Tópicos de debate - apenas o criador do estudo pode criar tópicos';
