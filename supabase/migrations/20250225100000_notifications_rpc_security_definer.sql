-- Inserir notificação via função com SECURITY DEFINER para contornar RLS.
-- Qualquer usuário autenticado pode chamar; a função insere com privilégios do owner.
CREATE OR REPLACE FUNCTION public.create_notification_for_user(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_action_url text DEFAULT NULL,
  p_is_read boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, action_url, is_read)
  VALUES (p_user_id, p_type, p_title, p_message, p_action_url, p_is_read)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification_for_user(uuid, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification_for_user(uuid, text, text, text, text, boolean) TO anon;
