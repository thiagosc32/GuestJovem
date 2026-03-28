-- RPCs e triggers multi-tenant: convite igreja, preenchimento church_id, visitor check-in, notificações, admin RPCs, Stripe hook.
--
-- Ordem: aplicar 20250321000000_multi_tenant_schema.sql (cria churches + users.church_id) antes deste ficheiro.
-- Aplicar só o RPC antes do schema quebra CREATE FUNCTION (corpo referencia users.church_id).

DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'church_id'
  ) THEN
    RAISE EXCEPTION
      'Multi-tenant: falta public.users.church_id. Execute primeiro a migração 20250321000000_multi_tenant_schema.sql (Supabase: por nome/timestamp anterior a este ficheiro).';
  END IF;
END;
$guard$;

-- Helpers RLS (idempotentes com 20250321100000): este ficheiro usa-as nos triggers/RPCs;
-- se a migração RLS ainda não correu, evita "function is_super_admin() does not exist".
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_church_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.church_id FROM public.users u WHERE u.id = auth.uid() LIMIT 1;
$$;

-- Preenche church_id no INSERT a partir do utilizador autenticado (super_admin deve definir explicitamente quando necessário)
CREATE OR REPLACE FUNCTION public.tenant_set_church_id_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.church_id IS NULL AND auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    NEW.church_id := public.current_user_church_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.event_registration_set_church_from_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.church_id IS NULL AND NEW.event_id IS NOT NULL THEN
    SELECT e.church_id INTO NEW.church_id FROM public.events e WHERE e.id = NEW.event_id LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_registrations_church ON public.event_registrations;
CREATE TRIGGER trg_event_registrations_church
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.event_registration_set_church_from_event();

DROP TRIGGER IF EXISTS trg_events_tenant_church ON public.events;
CREATE TRIGGER trg_events_tenant_church
  BEFORE INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.tenant_set_church_id_default();

DROP TRIGGER IF EXISTS trg_devotionals_tenant_church ON public.devotionals;
CREATE TRIGGER trg_devotionals_tenant_church
  BEFORE INSERT ON public.devotionals
  FOR EACH ROW EXECUTE FUNCTION public.tenant_set_church_id_default();

DROP TRIGGER IF EXISTS trg_community_posts_tenant_church ON public.community_posts;
CREATE TRIGGER trg_community_posts_tenant_church
  BEFORE INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.tenant_set_church_id_default();

DROP TRIGGER IF EXISTS trg_prayer_requests_tenant_church ON public.prayer_requests;
CREATE TRIGGER trg_prayer_requests_tenant_church
  BEFORE INSERT ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.tenant_set_church_id_default();

DROP TRIGGER IF EXISTS trg_group_studies_tenant_church ON public.group_studies;
CREATE TRIGGER trg_group_studies_tenant_church
  BEFORE INSERT ON public.group_studies
  FOR EACH ROW EXECUTE FUNCTION public.tenant_set_church_id_default();

CREATE OR REPLACE FUNCTION public.attendance_set_church_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_id IS NOT NULL THEN
    SELECT e.church_id INTO NEW.church_id FROM public.events e WHERE e.id = NEW.event_id LIMIT 1;
  END IF;
  IF NEW.church_id IS NULL AND auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    NEW.church_id := public.current_user_church_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attendance_tenant_church ON public.attendance_records;
CREATE TRIGGER trg_attendance_tenant_church
  BEFORE INSERT ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.attendance_set_church_id();

CREATE OR REPLACE FUNCTION public.event_rsvp_set_church_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.church_id IS NULL AND NEW.event_id IS NOT NULL THEN
    SELECT e.church_id INTO NEW.church_id FROM public.events e WHERE e.id = NEW.event_id LIMIT 1;
  END IF;
  IF NEW.church_id IS NULL AND auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    NEW.church_id := public.current_user_church_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_rsvps_tenant_church ON public.event_rsvps;
CREATE TRIGGER trg_event_rsvps_tenant_church
  BEFORE INSERT ON public.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.event_rsvp_set_church_id();

DROP TRIGGER IF EXISTS trg_achievements_tenant_church ON public.achievements;
CREATE TRIGGER trg_achievements_tenant_church
  BEFORE INSERT ON public.achievements
  FOR EACH ROW EXECUTE FUNCTION public.tenant_set_church_id_default();

DROP TRIGGER IF EXISTS trg_notifications_tenant_church ON public.notifications;
CREATE TRIGGER trg_notifications_tenant_church
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.tenant_set_church_id_default();

-- Participante automático no estudo em grupo inclui church_id
CREATE OR REPLACE FUNCTION public.group_study_auto_add_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.group_study_participants (study_id, user_id, church_id)
  VALUES (NEW.id, NEW.user_id, NEW.church_id)
  ON CONFLICT (study_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- === Auth: novo utilizador + convite ===
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

  INSERT INTO public.users (id, email, name, role, church_id, created_at)
  VALUES (NEW.id, NEW.email, user_name, 'user', v_church_id, NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    church_id = COALESCE(public.users.church_id, EXCLUDED.church_id);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Cria/atualiza public.users; aplica convite church_invites via raw_user_meta_data.invite_code ou igreja legado.';

-- === Pré-visualização pública do convite de igreja ===
CREATE OR REPLACE FUNCTION public.church_invite_preview(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) < 2 THEN
    RETURN json_build_object('valid', false, 'error', 'invalid_code');
  END IF;

  SELECT ch.id, ch.name, ch.ministry_name, ch.logo_url, ch.primary_color, ch.secondary_color, ch.status
    INTO r
  FROM public.church_invites ci
  JOIN public.churches ch ON ch.id = ci.church_id
  WHERE LOWER(ci.code) = LOWER(trim(p_code))
    AND ci.revoked_at IS NULL
    AND (ci.expires_at IS NULL OR ci.expires_at > now())
    AND (ci.max_uses IS NULL OR ci.uses_count < ci.max_uses)
    AND ch.status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'not_found');
  END IF;

  RETURN json_build_object(
    'valid', true,
    'church', json_build_object(
      'name', r.name,
      'ministry_name', r.ministry_name,
      'logo_url', r.logo_url,
      'primary_color', r.primary_color,
      'secondary_color', r.secondary_color
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.church_invite_preview(text) TO anon, authenticated;

-- === Visitor check-in: incluir church_id e restringir admin à sua igreja ===
CREATE OR REPLACE FUNCTION public.visitor_checkin_submit(
  p_token text,
  p_name text,
  p_is_first_time boolean,
  p_phone text,
  p_accepted_jesus boolean,
  p_congregates boolean,
  p_church_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.visitor_checkin_invites%ROWTYPE;
  v_church text;
  v_ev_church uuid;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 10 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO inv
  FROM public.visitor_checkin_invites
  WHERE token = trim(p_token)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'invalid_or_expired_invite');
  END IF;

  IF COALESCE(trim(p_name), '') = '' THEN
    RETURN json_build_object('success', false, 'error', 'name_required');
  END IF;

  SELECT church_id INTO v_ev_church FROM public.events WHERE id = inv.event_id LIMIT 1;
  IF v_ev_church IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'event_missing');
  END IF;

  v_church := CASE WHEN COALESCE(p_congregates, false) THEN nullif(trim(p_church_name), '') ELSE NULL END;

  INSERT INTO public.event_visitors (
    event_id,
    visitor_profile_id,
    name,
    is_first_time,
    contact_opt_in,
    phone,
    accepted_jesus,
    congregates,
    church_name,
    church_id
  ) VALUES (
    inv.event_id,
    NULL,
    trim(p_name),
    COALESCE(p_is_first_time, true),
    false,
    nullif(trim(COALESCE(p_phone, '')), ''),
    COALESCE(p_accepted_jesus, false),
    COALESCE(p_congregates, false),
    v_church,
    v_ev_church
  );

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.visitor_checkin_invite_create(p_event_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_ev_church uuid;
  v_admin_church uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT church_id INTO v_ev_church FROM public.events WHERE id = p_event_id LIMIT 1;
  IF v_ev_church IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'event_not_found');
  END IF;

  IF public.is_super_admin() THEN
    NULL;
  ELSE
    SELECT church_id INTO v_admin_church FROM public.users WHERE id = auth.uid() LIMIT 1;
    IF v_admin_church IS DISTINCT FROM v_ev_church THEN
      RETURN json_build_object('success', false, 'error', 'forbidden');
    END IF;
  END IF;

  v_token := gen_random_uuid()::text;

  INSERT INTO public.visitor_checkin_invites (event_id, token, created_by, is_active, church_id)
  VALUES (p_event_id, v_token, auth.uid(), true, v_ev_church);

  RETURN json_build_object('success', true, 'token', v_token);
END;
$$;

-- === Notificações em lote por igreja ===
DROP FUNCTION IF EXISTS public.notify_users_with_role(text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.notify_users_with_role(
  p_role text,
  p_type text,
  p_title text,
  p_message text,
  p_action_url text DEFAULT NULL,
  p_church_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count integer := 0;
  v_church uuid;
BEGIN
  v_church := COALESCE(p_church_id, public.current_user_church_id());
  IF v_church IS NULL AND NOT public.is_super_admin() THEN
    RETURN 0;
  END IF;

  FOR r IN (
    SELECT u.id AS uid, u.church_id AS cid
    FROM public.users u
    WHERE u.role = p_role
      AND (
        public.is_super_admin()
        OR (v_church IS NOT NULL AND u.church_id IS NOT DISTINCT FROM v_church)
      )
  )
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, action_url, is_read, church_id)
    VALUES (r.uid, p_type, p_title, p_message, p_action_url, false, r.cid);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_users_with_role(text, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_users_with_role(text, text, text, text, text, uuid) TO anon;

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
  FOR r IN (
    SELECT u.id AS uid, u.church_id AS cid
    FROM public.users u
    WHERE u.role = 'user'
      AND u.church_id IS NOT DISTINCT FROM NEW.church_id
  )
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, action_url, is_read, church_id)
    VALUES (r.uid, 'reminder', 'Novo devocional disponível', v_message, 'devotional', false, NEW.church_id);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification_for_user(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_action_url text DEFAULT NULL,
  p_is_read boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_cid uuid;
BEGIN
  SELECT church_id INTO v_cid FROM public.users WHERE id = p_user_id LIMIT 1;
  INSERT INTO public.notifications (user_id, type, title, message, action_url, is_read, church_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_action_url, p_is_read, v_cid)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- === Listagens admin restritas à igreja ===
DROP FUNCTION IF EXISTS public.get_active_youth_list(integer);

CREATE OR REPLACE FUNCTION public.get_active_youth_list(days_back integer DEFAULT 30)
RETURNS TABLE (id uuid, name text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH since AS (
    SELECT (now() - (days_back || ' days')::interval)::timestamptz AS t
  ),
  youth AS (
    SELECT u.id
    FROM public.users u
    WHERE u.role IS DISTINCT FROM 'admin'
      AND (
        public.is_super_admin()
        OR u.church_id IS NOT DISTINCT FROM public.current_user_church_id()
      )
  ),
  active_ids AS (
    SELECT u.id
    FROM public.users u
    JOIN youth y ON y.id = u.id
    WHERE u.last_active >= (SELECT t FROM since)
    UNION
    SELECT ar.user_id
    FROM since s
    JOIN public.attendance_records ar ON ar.check_in_time >= s.t
    JOIN youth y ON y.id = ar.user_id
    UNION
    SELECT e.user_id
    FROM since s2
    JOIN public.spiritual_xp_events e ON e.created_at >= s2.t
    JOIN youth y ON y.id = e.user_id
  ),
  distinct_active AS (
    SELECT DISTINCT active_ids.id AS id FROM active_ids
  )
  SELECT u.id, COALESCE(u.name, 'Sem nome'), u.avatar_url
  FROM public.users u
  INNER JOIN distinct_active da ON da.id = u.id
  ORDER BY u.name NULLS LAST;
$$;

DROP FUNCTION IF EXISTS public.get_devotional_completions_list(integer);

CREATE OR REPLACE FUNCTION public.get_devotional_completions_list(days_back integer DEFAULT 30)
RETURNS TABLE (id uuid, name text, avatar_url text, completions_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH since AS (
    SELECT (now() - (days_back || ' days')::interval)::timestamptz AS t
  ),
  counts AS (
    SELECT e.user_id, count(*) AS cnt
    FROM public.spiritual_xp_events e, since s
    WHERE e.action_type = 'devotional'
      AND e.created_at >= s.t
      AND (
        public.is_super_admin()
        OR e.church_id IS NOT DISTINCT FROM public.current_user_church_id()
      )
    GROUP BY e.user_id
  )
  SELECT u.id, COALESCE(u.name, 'Sem nome'), u.avatar_url, c.cnt AS completions_count
  FROM public.users u
  INNER JOIN counts c ON c.user_id = u.id
  WHERE u.role IS DISTINCT FROM 'admin'
    AND (
      public.is_super_admin()
      OR u.church_id IS NOT DISTINCT FROM public.current_user_church_id()
    )
  ORDER BY c.cnt DESC, u.name NULLS LAST;
$$;

-- === Super admin: igrejas e modo de provisão ===
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
          'user_count', (SELECT count(*)::int FROM public.users u WHERE u.church_id = c.id)
        ) ORDER BY c.created_at DESC
      ), '[]'::json)
    )
    FROM public.churches c
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_set_church_status(
  p_church_id uuid,
  p_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF p_status NOT IN ('pending_active', 'active', 'suspended') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_status');
  END IF;
  UPDATE public.churches SET status = p_status WHERE id = p_church_id;
  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_set_tenant_provisioning_mode(p_mode text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF p_mode NOT IN ('manual', 'stripe', 'both') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_mode');
  END IF;
  UPDATE public.app_settings SET value = p_mode WHERE key = 'tenant_provisioning_mode';
  INSERT INTO public.app_settings (key, value)
  SELECT 'tenant_provisioning_mode', p_mode
  WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'tenant_provisioning_mode');
  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_provisioning_mode()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('mode', 'both');
  END IF;
  SELECT value INTO v FROM public.app_settings WHERE key = 'tenant_provisioning_mode' LIMIT 1;
  RETURN json_build_object('mode', coalesce(v, 'both'));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_provisioning_mode() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.church_admin_update_branding(
  p_ministry_name text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_primary_color text DEFAULT NULL,
  p_secondary_color text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  SELECT church_id INTO v_cid FROM public.users WHERE id = auth.uid() AND role = 'admin' LIMIT 1;
  IF v_cid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  UPDATE public.churches SET
    ministry_name = COALESCE(nullif(trim(p_ministry_name), ''), ministry_name),
    logo_url = CASE WHEN p_logo_url IS NOT NULL THEN nullif(trim(p_logo_url), '') ELSE logo_url END,
    primary_color = COALESCE(nullif(trim(p_primary_color), ''), primary_color),
    secondary_color = COALESCE(nullif(trim(p_secondary_color), ''), secondary_color)
  WHERE id = v_cid;

  RETURN json_build_object('success', true);
END;
$$;

-- Stripe (chamada apenas com service_role a partir da Edge Function)
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

REVOKE ALL ON FUNCTION public.platform_stripe_provision_church(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_stripe_provision_church(text, text, text, text, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.super_admin_create_church(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_list_churches() TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_set_church_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_set_tenant_provisioning_mode(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.church_admin_update_branding(text, text, text, text) TO authenticated;

-- Comentários: church_id a partir do post/pedido pai
CREATE OR REPLACE FUNCTION public.community_comment_set_church()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.church_id IS NULL THEN
    SELECT cp.church_id INTO NEW.church_id FROM public.community_posts cp WHERE cp.id = NEW.post_id LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prayer_comment_set_church()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.church_id IS NULL THEN
    SELECT pr.church_id INTO NEW.church_id FROM public.prayer_requests pr WHERE pr.id = NEW.prayer_request_id LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_comment_church ON public.community_post_comments;
CREATE TRIGGER trg_community_comment_church
  BEFORE INSERT ON public.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_comment_set_church();

DROP TRIGGER IF EXISTS trg_prayer_comment_church ON public.prayer_request_comments;
CREATE TRIGGER trg_prayer_comment_church
  BEFORE INSERT ON public.prayer_request_comments
  FOR EACH ROW EXECUTE FUNCTION public.prayer_comment_set_church();

CREATE OR REPLACE FUNCTION public.prayer_prayer_set_church()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.church_id IS NULL THEN
    SELECT pr.church_id INTO NEW.church_id FROM public.prayer_requests pr WHERE pr.id = NEW.request_id LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prayer_prayers_church ON public.prayer_request_prayers;
CREATE TRIGGER trg_prayer_prayers_church
  BEFORE INSERT ON public.prayer_request_prayers
  FOR EACH ROW EXECUTE FUNCTION public.prayer_prayer_set_church();

CREATE OR REPLACE FUNCTION public.group_study_topic_set_church()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.church_id IS NULL THEN
    SELECT g.church_id INTO NEW.church_id FROM public.group_studies g WHERE g.id = NEW.study_id LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_study_topic_church ON public.group_study_topics;
CREATE TRIGGER trg_group_study_topic_church
  BEFORE INSERT ON public.group_study_topics
  FOR EACH ROW EXECUTE FUNCTION public.group_study_topic_set_church();

CREATE OR REPLACE FUNCTION public.group_study_reply_set_church()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.church_id IS NULL THEN
    SELECT t.church_id INTO NEW.church_id FROM public.group_study_topics t WHERE t.id = NEW.topic_id LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_study_reply_church ON public.group_study_topic_replies;
CREATE TRIGGER trg_group_study_reply_church
  BEFORE INSERT ON public.group_study_topic_replies
  FOR EACH ROW EXECUTE FUNCTION public.group_study_reply_set_church();

CREATE OR REPLACE FUNCTION public.group_study_comment_set_church()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.church_id IS NULL THEN
    SELECT g.church_id INTO NEW.church_id FROM public.group_studies g WHERE g.id = NEW.study_id LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_study_comment_church ON public.group_study_comments;
CREATE TRIGGER trg_group_study_comment_church
  BEFORE INSERT ON public.group_study_comments
  FOR EACH ROW EXECUTE FUNCTION public.group_study_comment_set_church();

CREATE OR REPLACE FUNCTION public.group_study_participant_set_church()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.church_id IS NULL THEN
    SELECT g.church_id INTO NEW.church_id FROM public.group_studies g WHERE g.id = NEW.study_id LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_study_participant_church ON public.group_study_participants;
CREATE TRIGGER trg_group_study_participant_church
  BEFORE INSERT ON public.group_study_participants
  FOR EACH ROW EXECUTE FUNCTION public.group_study_participant_set_church();

-- OAuth / utilizador já criado na igreja legado: aplicar convite pendente
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
    AND u.church_id IS NOT DISTINCT FROM v_legado;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RETURN json_build_object('success', false, 'error', 'already_assigned');
  END IF;

  UPDATE public.church_invites SET uses_count = uses_count + 1 WHERE id = v_inv_id;
  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_church_invite_for_current_user(text) TO authenticated;