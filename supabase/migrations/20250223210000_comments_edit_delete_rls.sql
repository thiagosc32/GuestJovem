-- Autor do comentário pode editar e excluir (pedidos de oração)
DROP POLICY IF EXISTS "prayer_request_comments_update_own" ON prayer_request_comments;
CREATE POLICY "prayer_request_comments_update_own" ON prayer_request_comments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "prayer_request_comments_delete_own" ON prayer_request_comments;
CREATE POLICY "prayer_request_comments_delete_own" ON prayer_request_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Autor do comentário pode editar e excluir (Mesa Guest Jovem)
DROP POLICY IF EXISTS "community_post_comments_update_own" ON community_post_comments;
CREATE POLICY "community_post_comments_update_own" ON community_post_comments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_post_comments_delete_own" ON community_post_comments;
CREATE POLICY "community_post_comments_delete_own" ON community_post_comments FOR DELETE
  USING (auth.uid() = user_id);
