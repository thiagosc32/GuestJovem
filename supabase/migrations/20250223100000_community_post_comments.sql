-- Comentários nos posts da Mesa Guest Jovem
CREATE TABLE IF NOT EXISTS community_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_post_comments_post_id ON community_post_comments(post_id);

ALTER TABLE community_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_post_comments_select" ON community_post_comments;
CREATE POLICY "community_post_comments_select" ON community_post_comments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM community_posts cp WHERE cp.id = community_post_comments.post_id AND cp.is_moderated = true)
  );

DROP POLICY IF EXISTS "community_post_comments_insert" ON community_post_comments;
CREATE POLICY "community_post_comments_insert" ON community_post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Atualizar comments_count no post ao inserir ou deletar comentário
CREATE OR REPLACE FUNCTION community_posts_update_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_post_comments_count ON community_post_comments;
CREATE TRIGGER trg_community_post_comments_count
  AFTER INSERT OR DELETE ON community_post_comments
  FOR EACH ROW EXECUTE PROCEDURE community_posts_update_comments_count();
