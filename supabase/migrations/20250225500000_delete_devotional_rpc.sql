-- Excluir devocional via RPC (SECURITY DEFINER) para não depender de política RLS de DELETE.
-- Apenas usuários com role = 'admin' podem chamar.
CREATE OR REPLACE FUNCTION public.delete_devotional_admin(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir devocionais.';
  END IF;
  DELETE FROM devotionals WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_devotional_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_devotional_admin(uuid) TO anon;
