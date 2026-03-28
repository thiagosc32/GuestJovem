-- Bases já migradas: funções antigas ainda referenciam gen_random_bytes (pgcrypto).
-- Recria helper + RPCs que geram códigos de convite.

CREATE OR REPLACE FUNCTION public.tenant_invite_random_hex(p_len int DEFAULT 12)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  s text := '';
  n int := greatest(1, least(coalesce(p_len, 12), 64));
BEGIN
  WHILE length(s) < n LOOP
    s := s || md5(random()::text || clock_timestamp()::text || random()::text);
  END LOOP;
  RETURN lower(substr(s, 1, n));
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

CREATE OR REPLACE FUNCTION public.super_admin_create_church(
  p_name text,
  p_ministry_name text,
  p_invite_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_code text;
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

  RETURN json_build_object('success', true, 'church_id', v_id, 'invite_code', v_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_stripe_provision_church(
  p_church_name text,
  p_ministry_name text,
  p_customer_id text DEFAULT NULL,
  p_subscription_id text DEFAULT NULL,
  p_invite_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
  v_id uuid;
  v_code text;
BEGIN
  IF coalesce(auth.jwt()->>'role', '') IS DISTINCT FROM 'service_role' THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT value INTO v_mode FROM public.app_settings WHERE key = 'tenant_provisioning_mode' LIMIT 1;
  IF v_mode NOT IN ('stripe', 'both') THEN
    RETURN json_build_object('success', false, 'error', 'stripe_disabled');
  END IF;

  INSERT INTO public.churches (name, ministry_name, status, stripe_customer_id, stripe_subscription_id, slug)
  VALUES (
    trim(p_church_name),
    trim(p_ministry_name),
    'active',
    nullif(trim(p_customer_id), ''),
    nullif(trim(p_subscription_id), ''),
    'c-' || replace(gen_random_uuid()::text, '-', '')
  )
  RETURNING id INTO v_id;

  v_code := COALESCE(nullif(lower(trim(p_invite_code)), ''), public.tenant_invite_random_hex(12));

  INSERT INTO public.church_invites (church_id, code)
  VALUES (v_id, v_code);

  RETURN json_build_object('success', true, 'church_id', v_id, 'invite_code', v_code);
END;
$$;
