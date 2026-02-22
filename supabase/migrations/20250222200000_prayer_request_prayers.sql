-- Registro de quem orou por cada pedido (um clique por usuário; segundo clique desfaz)
CREATE TABLE IF NOT EXISTS prayer_request_prayers (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_prayer_request_prayers_request_id ON prayer_request_prayers(request_id);

ALTER TABLE prayer_request_prayers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver próprias orações" ON prayer_request_prayers;
CREATE POLICY "Ver próprias orações" ON prayer_request_prayers FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Inserir própria oração" ON prayer_request_prayers;
CREATE POLICY "Inserir própria oração" ON prayer_request_prayers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Remover própria oração" ON prayer_request_prayers;
CREATE POLICY "Remover própria oração" ON prayer_request_prayers FOR DELETE USING (auth.uid() = user_id);

-- Função: toggle orar (adiciona ou remove e atualiza prayer_count)
CREATE OR REPLACE FUNCTION toggle_pray(p_user_id uuid, p_request_id uuid)
RETURNS TABLE(has_prayed boolean, new_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
  v_count bigint;
BEGIN
  SELECT EXISTS(SELECT 1 FROM prayer_request_prayers WHERE user_id = p_user_id AND request_id = p_request_id) INTO v_exists;

  IF v_exists THEN
    DELETE FROM prayer_request_prayers WHERE user_id = p_user_id AND request_id = p_request_id;
    UPDATE prayer_requests SET prayer_count = GREATEST(0, COALESCE(prayer_count, 0) - 1) WHERE id = p_request_id;
    SELECT GREATEST(0, COALESCE(prayer_count, 0) - 1) INTO v_count FROM prayer_requests WHERE id = p_request_id;
    has_prayed := false;
    new_count := v_count;
    RETURN NEXT;
  ELSE
    INSERT INTO prayer_request_prayers (user_id, request_id) VALUES (p_user_id, p_request_id);
    UPDATE prayer_requests SET prayer_count = COALESCE(prayer_count, 0) + 1 WHERE id = p_request_id;
    SELECT COALESCE(prayer_count, 0) + 1 INTO v_count FROM prayer_requests WHERE id = p_request_id;
    has_prayed := true;
    new_count := v_count;
    RETURN NEXT;
  END IF;
END;
$$;
