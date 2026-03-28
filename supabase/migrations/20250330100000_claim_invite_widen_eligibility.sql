-- claim_church_invite_for_current_user: alargar quem pode aceitar convite já autenticado.
-- Antes: só utilizadores com church_id = igreja legado (slug legado).
-- Agora: também church_id NULL (perfil órfão) e role = 'user' noutra igreja (entrar/trocar via link).
-- Continua a excluir super_admin; admins só migram se estiverem na igreja legado (comportamento anterior).

CREATE OR REPLACE FUNCTION public.claim_church_invite_for_current_user(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_legado uuid;
  v_target uuid;
  v_inv_id uuid;
  v_n int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_uid AND role = 'super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'super_admin');
  END IF;

  SELECT id INTO v_legado FROM public.churches WHERE slug = 'legado' LIMIT 1;

  SELECT ci.id, ci.church_id INTO v_inv_id, v_target
  FROM public.church_invites ci
  JOIN public.churches ch ON ch.id = ci.church_id
  WHERE lower(ci.code) = lower(trim(p_code))
    AND ci.revoked_at IS NULL
    AND ch.status = 'active'
    AND (ci.expires_at IS NULL OR ci.expires_at > now())
    AND (ci.max_uses IS NULL OR ci.uses_count < ci.max_uses)
  LIMIT 1;

  IF v_inv_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invalid_invite');
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_uid AND church_id IS NOT DISTINCT FROM v_target) THEN
    RETURN json_build_object('success', true, 'noop', true);
  END IF;

  UPDATE public.users u
  SET church_id = v_target
  WHERE u.id = v_uid
    AND u.role IS DISTINCT FROM 'super_admin'
    AND (
      (v_legado IS NOT NULL AND u.church_id IS NOT DISTINCT FROM v_legado)
      OR u.church_id IS NULL
      OR (u.role = 'user' AND u.church_id IS DISTINCT FROM v_target)
    );

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RETURN json_build_object('success', false, 'error', 'already_assigned');
  END IF;

  UPDATE public.church_invites SET uses_count = uses_count + 1 WHERE id = v_inv_id;
  RETURN json_build_object('success', true);
END;
$$;
