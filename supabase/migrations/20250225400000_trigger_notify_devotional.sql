-- Trigger: ao inserir um devocional, notificar todos os usuários com role 'user'.
-- Roda no servidor com SECURITY DEFINER, independente do app.
CREATE OR REPLACE FUNCTION public.notify_users_new_devotional()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_title text;
  v_message text;
BEGIN
  v_title := COALESCE(NEW.title, 'Novo devocional');
  v_message := '"' || v_title || '" — toque para ler.';
  FOR r IN (SELECT id FROM users WHERE role = 'user')
  LOOP
    INSERT INTO notifications (user_id, type, title, message, action_url, is_read)
    VALUES (r.id, 'reminder', 'Novo devocional disponível', v_message, 'devotional', false);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_new_devotional ON devotionals;
CREATE TRIGGER notify_on_new_devotional
  AFTER INSERT ON devotionals
  FOR EACH ROW
  EXECUTE PROCEDURE public.notify_users_new_devotional();
