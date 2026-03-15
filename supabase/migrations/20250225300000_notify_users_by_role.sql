-- Notificar todos os usuários com um dado role (ex.: novo devocional, novo evento).
-- Executa com SECURITY DEFINER para ler users e inserir em notifications sem bloquear por RLS.
CREATE OR REPLACE FUNCTION public.notify_users_with_role(
  p_role text,
  p_type text,
  p_title text,
  p_message text,
  p_action_url text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count integer := 0;
BEGIN
  FOR r IN (SELECT id FROM users WHERE role = p_role)
  LOOP
    INSERT INTO notifications (user_id, type, title, message, action_url, is_read)
    VALUES (r.id, p_type, p_title, p_message, p_action_url, false);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_users_with_role(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_users_with_role(text, text, text, text, text) TO anon;
