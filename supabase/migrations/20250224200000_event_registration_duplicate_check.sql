-- Função para verificar se já existe inscrição (mesmo evento + mesmo e-mail).
-- Usada pelo app para evitar duplicatas sem expor dados; acessível a todos (SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.check_event_registration_duplicate(p_event_id uuid, p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_registrations
    WHERE event_id = p_event_id AND lower(trim(email)) = lower(trim(p_email))
  );
$$;

COMMENT ON FUNCTION public.check_event_registration_duplicate(uuid, text) IS 'Returns true if this email is already registered for this event. Used by app to block duplicate registrations.';
