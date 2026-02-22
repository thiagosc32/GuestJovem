-- Mesa Guest Jovem (mural comunitário)
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  is_moderated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_posts_select_moderated" ON community_posts;
CREATE POLICY "community_posts_select_moderated" ON community_posts FOR SELECT
  USING (is_moderated = true);

DROP POLICY IF EXISTS "community_posts_insert_own" ON community_posts;
CREATE POLICY "community_posts_insert_own" ON community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_posts_delete_own" ON community_posts;
CREATE POLICY "community_posts_delete_own" ON community_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Função para incrementar likes (usada pelo app)
DROP FUNCTION IF EXISTS increment_post_likes(uuid);
CREATE FUNCTION increment_post_likes(post_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE community_posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = post_id;
  SELECT COALESCE(likes_count, 0) INTO new_count FROM community_posts WHERE id = post_id;
  RETURN new_count;
END;
$$;
