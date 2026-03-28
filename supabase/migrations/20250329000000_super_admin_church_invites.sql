-- Super admin: listar convite principal por igreja + criar novo convite (ex.: igreja legado sem linha em church_invites)

CREATE OR REPLACE FUNCTION public.super_admin_list_churches()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  RETURN (
    SELECT json_build_object(
      'success', true,
      'churches', coalesce(json_agg(
        json_build_object(
          'id', c.id,
          'name', c.name,
          'ministry_name', c.ministry_name,
          'status', c.status,
          'slug', c.slug,
          'created_at', c.created_at,
          'user_count', (SELECT count(*)::int FROM public.users u WHERE u.church_id = c.id),
          'primary_invite_code', (
            SELECT ci.code
            FROM public.church_invites ci
            WHERE ci.church_id = c.id
              AND ci.revoked_at IS NULL
              AND (ci.expires_at IS NULL OR ci.expires_at > now())
            ORDER BY ci.created_at DESC
            LIMIT 1
          ),
          'active_invite_count', (
            SELECT count(*)::int
            FROM public.church_invites x
            WHERE x.church_id = c.id
              AND x.revoked_at IS NULL
              AND (x.expires_at IS NULL OR x.expires_at > now())
          )
        ) ORDER BY c.created_at DESC
      ), '[]'::json)
    )
    FROM public.churches c
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_add_church_invite(
  p_church_id uuid,
  p_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.churches WHERE id = p_church_id) THEN
    RETURN json_build_object('success', false, 'error', 'church_not_found');
  END IF;

  v_code := COALESCE(
    nullif(lower(trim(p_code)), ''),
    public.tenant_invite_random_hex(12)
  );

  IF EXISTS (SELECT 1 FROM public.church_invites WHERE lower(code) = v_code) THEN
    v_code := public.tenant_invite_random_hex(12);
  END IF;

  INSERT INTO public.church_invites (church_id, code, created_by)
  VALUES (p_church_id, v_code, auth.uid());

  RETURN json_build_object('success', true, 'invite_code', v_code, 'church_id', p_church_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_admin_add_church_invite(uuid, text) TO authenticated;
