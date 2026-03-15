-- Permitir que admins excluam devocionais (RLS não tinha política de DELETE).
DROP POLICY IF EXISTS "Admins can delete devotionals" ON devotionals;
CREATE POLICY "Admins can delete devotionals"
  ON devotionals
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
