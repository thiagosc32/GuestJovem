-- Código de convite ativo da igreja do utilizador (para pós-logout: tela de login com branding da igreja).

CREATE OR REPLACE FUNCTION public.church_invite_code_for_my_church()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid uuid;
  v_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT u.church_id INTO v_cid
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1;

  IF v_cid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT ci.code INTO v_code
  FROM public.church_invites ci
  JOIN public.churches ch ON ch.id = ci.church_id
  WHERE ci.church_id = v_cid
    AND ci.revoked_at IS NULL
    AND ch.status = 'active'
    AND (ci.expires_at IS NULL OR ci.expires_at > now())
    AND (ci.max_uses IS NULL OR ci.uses_count < ci.max_uses)
  ORDER BY ci.created_at ASC
  LIMIT 1;

  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION public.church_invite_code_for_my_church() IS
  'Devolve um código de convite válido da igreja do utilizador autenticado (para reabrir login com marca da igreja).';

GRANT EXECUTE ON FUNCTION public.church_invite_code_for_my_church() TO authenticated;
