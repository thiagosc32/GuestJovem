-- E-mail do administrador ao criar igreja manualmente: liga conta existente ou fica pendente até o registo.

CREATE TABLE IF NOT EXISTS public.pending_church_admin_invites (
  email_normalized text PRIMARY KEY,
  church_id uuid NOT NULL REFERENCES public.churches (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pending_church_admin_invites IS
  'Super admin define e-mail do admin da igreja; se ainda não existe conta, aplica-se no primeiro registo com esse e-mail.';

ALTER TABLE public.pending_church_admin_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
  v_invite text;
  v_church_id uuid;
  v_legado uuid;
  v_inv_row_id uuid;
  v_pending_church uuid;
  v_role text := 'user';
BEGIN
  user_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Usuário'
  );

  IF NEW.email IS NOT NULL THEN
    DELETE FROM public.users AS u
    WHERE u.email = NEW.email
      AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id);
  END IF;

  SELECT p.church_id INTO v_pending_church
  FROM public.pending_church_admin_invites p
  WHERE p.email_normalized = lower(trim(COALESCE(NEW.email, '')))
  LIMIT 1;

  IF v_pending_church IS NOT NULL THEN
    DELETE FROM public.pending_church_admin_invites
    WHERE email_normalized = lower(trim(COALESCE(NEW.email, '')));
    v_church_id := v_pending_church;
    v_role := 'admin';
  ELSE
    SELECT id INTO v_legado FROM public.churches WHERE slug = 'legado' LIMIT 1;
    v_church_id := v_legado;
    v_invite := NULLIF(LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'invite_code', ''))), '');

    IF v_invite IS NOT NULL THEN
      SELECT ci.id, ci.church_id INTO v_inv_row_id, v_church_id
      FROM public.church_invites ci
      JOIN public.churches ch ON ch.id = ci.church_id
      WHERE LOWER(ci.code) = v_invite
        AND ci.revoked_at IS NULL
        AND ch.status = 'active'
        AND (ci.expires_at IS NULL OR ci.expires_at > now())
        AND (ci.max_uses IS NULL OR ci.uses_count < ci.max_uses)
      LIMIT 1;

      IF v_inv_row_id IS NULL THEN
        v_church_id := v_legado;
      ELSE
        UPDATE public.church_invites SET uses_count = uses_count + 1 WHERE id = v_inv_row_id;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.users (id, email, name, role, church_id, created_at)
  VALUES (NEW.id, NEW.email, user_name, v_role, v_church_id, NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    church_id = CASE
      WHEN EXCLUDED.role = 'admin' THEN EXCLUDED.church_id
      ELSE COALESCE(public.users.church_id, EXCLUDED.church_id)
    END,
    role = CASE
      WHEN EXCLUDED.role = 'admin' THEN 'admin'
      ELSE public.users.role
    END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Cria/atualiza public.users; convite church_invites; ou admin pendente por e-mail (pending_church_admin_invites).';

DROP FUNCTION IF EXISTS public.super_admin_create_church(text, text, text);

CREATE OR REPLACE FUNCTION public.super_admin_create_church(
  p_name text,
  p_ministry_name text,
  p_invite_code text DEFAULT NULL,
  p_admin_email text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_code text;
  v_admin_email text;
  v_n int;
  v_linked boolean := false;
  v_pending boolean := false;
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  INSERT INTO public.churches (name, ministry_name, status, slug)
  VALUES (
    trim(p_name),
    trim(p_ministry_name),
    'active',
    'c-' || replace(gen_random_uuid()::text, '-', '')
  )
  RETURNING id INTO v_id;

  v_code := COALESCE(
    nullif(lower(trim(p_invite_code)), ''),
    public.tenant_invite_random_hex(12)
  );

  IF EXISTS (SELECT 1 FROM public.church_invites WHERE lower(code) = v_code) THEN
    v_code := public.tenant_invite_random_hex(12);
  END IF;

  INSERT INTO public.church_invites (church_id, code, created_by)
  VALUES (v_id, v_code, auth.uid());

  v_admin_email := nullif(lower(trim(p_admin_email)), '');

  IF v_admin_email IS NOT NULL AND position('@' IN v_admin_email) > 0 THEN
    IF EXISTS (SELECT 1 FROM public.users WHERE lower(trim(email)) = v_admin_email AND role = 'super_admin') THEN
      RETURN json_build_object(
        'success', true,
        'church_id', v_id,
        'invite_code', v_code,
        'admin_linked', false,
        'admin_pending', false,
        'admin_note', 'E-mail pertence a super admin; não foi associado.'
      );
    END IF;

    UPDATE public.users u
    SET church_id = v_id,
        role = 'admin'
    WHERE lower(trim(u.email)) = v_admin_email
      AND u.role IS DISTINCT FROM 'super_admin';

    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n > 0 THEN
      v_linked := true;
    ELSE
      INSERT INTO public.pending_church_admin_invites (email_normalized, church_id)
      VALUES (v_admin_email, v_id)
      ON CONFLICT (email_normalized) DO UPDATE
        SET church_id = EXCLUDED.church_id,
            created_at = now();
      v_pending := true;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'church_id', v_id,
    'invite_code', v_code,
    'admin_linked', v_linked,
    'admin_pending', v_pending
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_admin_create_church(text, text, text, text) TO authenticated;
