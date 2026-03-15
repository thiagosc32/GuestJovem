-- Corrigir RLS de INSERT em notifications: permitir que usuário autenticado crie notificação
-- (admin para resposta a pedido privado; qualquer um para notificações de comentário, etc.).
DROP POLICY IF EXISTS "notifications_insert_any" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_admin" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;

CREATE POLICY "notifications_insert_authenticated"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
