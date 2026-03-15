-- Permite que usuários autenticados (admins) excluam registros de visitantes
DROP POLICY IF EXISTS "event_visitors_delete_authenticated" ON event_visitors;
CREATE POLICY "event_visitors_delete_authenticated" ON event_visitors
  FOR DELETE TO authenticated USING (true);
