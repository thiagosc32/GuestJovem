-- Ao atualizar public.users no ON CONFLICT (mesmo auth id), priorizar igreja derivada do convite
-- em user_metadata em relação ao church_id antigo — evita “grudar” na igreja anterior após
-- re-cadastro com novo invite_code.

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
      WHEN NULLIF(LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'invite_code', ''))), '') IS NOT NULL THEN EXCLUDED.church_id
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
  'Cria/atualiza public.users; convite via metadata; admin pendente; ON CONFLICT respeita novo invite_code.';
