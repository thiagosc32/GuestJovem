-- Super admin: listar admins da igreja, remover papel admin, reatribuir e-mail admin.

CREATE OR REPLACE FUNCTION public.super_admin_get_church_admins(p_church_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.churches WHERE id = p_church_id) THEN
    RETURN json_build_object('success', false, 'error', 'church_not_found');
  END IF;

  RETURN json_build_object(
    'success', true,
    'admins', coalesce(
      (
        SELECT json_agg(
          json_build_object(
            'id', u.id,
            'email', u.email,
            'name', u.name
          ) ORDER BY u.email
        )
        FROM public.users u
        WHERE u.church_id = p_church_id
          AND u.role = 'admin'
      ),
      '[]'::json
    ),
    'pending_admin_emails', coalesce(
      (
        SELECT json_agg(p.email_normalized ORDER BY p.created_at)
        FROM public.pending_church_admin_invites p
        WHERE p.church_id = p_church_id
      ),
      '[]'::json
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_remove_church_admin(p_church_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n int;
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  UPDATE public.users u
  SET role = 'user'
  WHERE u.id = p_user_id
    AND u.church_id = p_church_id
    AND u.role = 'admin';

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_clear_church_admin_slots(p_church_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  UPDATE public.users
  SET role = 'user'
  WHERE church_id = p_church_id
    AND role = 'admin';

  DELETE FROM public.pending_church_admin_invites
  WHERE church_id = p_church_id;

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_assign_church_admin(p_church_id uuid, p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_n int;
  v_linked boolean := false;
  v_pending boolean := false;
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.churches WHERE id = p_church_id) THEN
    RETURN json_build_object('success', false, 'error', 'church_not_found');
  END IF;

  v_email := nullif(lower(trim(p_email)), '');
  IF v_email IS NULL OR position('@' IN v_email) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_email');
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE lower(trim(email)) = v_email AND role = 'super_admin') THEN
    RETURN json_build_object('success', false, 'error', 'super_admin_email');
  END IF;

  UPDATE public.users
  SET role = 'user'
  WHERE church_id = p_church_id
    AND role = 'admin';

  DELETE FROM public.pending_church_admin_invites
  WHERE church_id = p_church_id;

  DELETE FROM public.pending_church_admin_invites
  WHERE email_normalized = v_email;

  UPDATE public.users u
  SET church_id = p_church_id,
      role = 'admin'
  WHERE lower(trim(u.email)) = v_email
    AND u.role IS DISTINCT FROM 'super_admin';

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n > 0 THEN
    v_linked := true;
  ELSE
    INSERT INTO public.pending_church_admin_invites (email_normalized, church_id)
    VALUES (v_email, p_church_id);
    v_pending := true;
  END IF;

  RETURN json_build_object(
    'success', true,
    'admin_linked', v_linked,
    'admin_pending', v_pending
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_admin_get_church_admins(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_remove_church_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_clear_church_admin_slots(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_assign_church_admin(uuid, text) TO authenticated;
