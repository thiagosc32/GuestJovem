-- Permite que o usuário apague apenas as suas próprias notificações (só para ele).
CREATE POLICY "users_delete_own_notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);
