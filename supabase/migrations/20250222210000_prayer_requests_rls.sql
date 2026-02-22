-- RLS para prayer_requests: usuário vê próprios e públicos; admin vê e atualiza privados
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prayer_requests_select" ON prayer_requests;
CREATE POLICY "prayer_requests_select" ON prayer_requests FOR SELECT USING (
  (user_id = auth.uid())
  OR (is_public = true)
  OR (is_public = false AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
);

DROP POLICY IF EXISTS "prayer_requests_insert" ON prayer_requests;
CREATE POLICY "prayer_requests_insert" ON prayer_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "prayer_requests_update_own" ON prayer_requests;
CREATE POLICY "prayer_requests_update_own" ON prayer_requests FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "prayer_requests_update_admin_private" ON prayer_requests;
CREATE POLICY "prayer_requests_update_admin_private" ON prayer_requests FOR UPDATE USING (
  is_public = false AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "prayer_requests_delete" ON prayer_requests;
CREATE POLICY "prayer_requests_delete" ON prayer_requests FOR DELETE USING (user_id = auth.uid());
