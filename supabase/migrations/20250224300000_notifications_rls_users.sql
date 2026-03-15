-- Garantir que usuários (role user) possam ver suas próprias notificações.
-- Remove políticas antigas de SELECT que possam restringir a admins e recria a correta.
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "users_select_own_notifications" ON notifications;

CREATE POLICY "users_select_own_notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Garantir que INSERT siga permitindo criar notificação para qualquer user_id (ex.: outro usuário)
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "notifications_insert_any"
  ON notifications
  FOR INSERT
  WITH CHECK (true);
