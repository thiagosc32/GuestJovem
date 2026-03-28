-- Multi-tenant: igrejas (churches), convites de entrada, church_id nas tabelas de negócio, papel super_admin.
-- Igreja legado para dados existentes + app_settings.tenant_provisioning_mode

-- 1) churches
CREATE TABLE IF NOT EXISTS public.churches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ministry_name text NOT NULL DEFAULT 'Guest Jovem',
  logo_url text,
  primary_color text,
  secondary_color text,
  slug text UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending_active', 'active', 'suspended')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.churches IS 'Tenant (igreja): white-label e isolamento por church_id';

CREATE INDEX IF NOT EXISTS idx_churches_status ON public.churches (status);

-- 2) church_invites (entrada /convite/:code)
CREATE TABLE IF NOT EXISTS public.church_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches (id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz,
  max_uses int,
  uses_count int NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS church_invites_code_lower_idx ON public.church_invites (lower(code));

ALTER TABLE public.church_invites ENABLE ROW LEVEL SECURITY;

-- Sem políticas públicas: acesso via RPC SECURITY DEFINER ou service role

-- 3) Ampliar role em users (remove check antigo se existir)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Papéis legados: NULL, maiúsculas ou valores fora do conjunto quebram o CHECK novo
UPDATE public.users
SET role = lower(btrim(role))
WHERE role IS NOT NULL AND role <> lower(btrim(role));

UPDATE public.users
SET role = 'user'
WHERE role IS NULL
   OR btrim(coalesce(role, '')) = ''
   OR role NOT IN ('user', 'admin', 'super_admin');

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'super_admin'));

-- Igreja do utilizador (nulo = super_admin de plataforma)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS church_id uuid REFERENCES public.churches (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_users_church_id ON public.users (church_id);

-- 4) Igreja legado + backfill users
INSERT INTO public.churches (name, ministry_name, status, slug)
SELECT 'Guest Jovem (legado)', 'Guest Jovem', 'active', 'legado'
WHERE NOT EXISTS (SELECT 1 FROM public.churches WHERE slug = 'legado');

DO $$
DECLARE
  v_legado uuid;
BEGIN
  SELECT id INTO v_legado FROM public.churches WHERE slug = 'legado' LIMIT 1;
  UPDATE public.users SET church_id = v_legado WHERE church_id IS NULL AND role IS DISTINCT FROM 'super_admin';
END $$;

-- super_admin deve ter church_id nulo
ALTER TABLE public.users
  ADD CONSTRAINT users_super_admin_no_church CHECK (
    role IS DISTINCT FROM 'super_admin' OR church_id IS NULL
  );

ALTER TABLE public.users
  ADD CONSTRAINT users_member_has_church CHECK (
    role = 'super_admin' OR church_id IS NOT NULL
  );

-- 5) Adicionar church_id às tabelas de negócio (só se a tabela existir — bases parciais / migrações não aplicadas)
DO $add_tenant_church_id$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'events', 'devotionals', 'announcements', 'verse_of_week', 'community_posts', 'prayer_requests',
    'event_registrations', 'attendance_records', 'visitor_profiles', 'event_visitors', 'visitor_checkin_invites',
    'event_rsvps', 'notifications', 'achievements', 'achievement_definitions', 'group_studies',
    'youth_profiles', 'spiritual_journey_profiles', 'spiritual_xp_events', 'spiritual_disciplines',
    'spiritual_discipline_completions', 'spiritual_reflections', 'ministries', 'ministry_tasks',
    'ministry_agenda', 'ministry_members', 'ministry_purposes', 'ministry_calendar_events',
    'ministry_event_schedule', 'ministry_monthly_focus', 'schedule_types', 'community_post_comments',
    'prayer_request_comments', 'prayer_request_prayers', 'group_study_comments', 'group_study_participants',
    'group_study_topics', 'group_study_topic_replies'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS church_id uuid REFERENCES public.churches (id)',
        t
      );
    END IF;
  END LOOP;
END;
$add_tenant_church_id$;

-- 6) Backfill com igreja legado (ignora tabelas inexistentes)
DO $backfill_legado$
DECLARE
  v_legado uuid;
  t text;
  backfill_tables text[] := ARRAY[
    'events', 'devotionals', 'announcements', 'verse_of_week', 'community_posts', 'prayer_requests',
    'event_registrations', 'attendance_records', 'visitor_profiles', 'event_visitors', 'visitor_checkin_invites',
    'event_rsvps', 'notifications', 'achievements', 'achievement_definitions', 'group_studies',
    'spiritual_disciplines', 'ministries', 'ministry_tasks', 'ministry_agenda', 'ministry_members',
    'ministry_purposes', 'ministry_calendar_events', 'ministry_event_schedule', 'ministry_monthly_focus',
    'schedule_types'
  ];
BEGIN
  SELECT id INTO v_legado FROM public.churches WHERE slug = 'legado' LIMIT 1;
  IF v_legado IS NULL THEN
    RETURN;
  END IF;

  FOREACH t IN ARRAY backfill_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    )
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t AND column_name = 'church_id'
       ) THEN
      EXECUTE format('UPDATE public.%I SET church_id = $1 WHERE church_id IS NULL', t) USING v_legado;
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_post_comments')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_posts') THEN
    UPDATE public.community_post_comments c SET church_id = v_legado FROM public.community_posts p
      WHERE c.post_id = p.id AND c.church_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prayer_request_comments')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prayer_requests') THEN
    UPDATE public.prayer_request_comments c SET church_id = v_legado FROM public.prayer_requests p
      WHERE c.prayer_request_id = p.id AND c.church_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prayer_request_prayers')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prayer_requests') THEN
    UPDATE public.prayer_request_prayers x SET church_id = v_legado FROM public.prayer_requests p
      WHERE x.request_id = p.id AND x.church_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_study_comments')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_studies') THEN
    UPDATE public.group_study_comments c SET church_id = v_legado FROM public.group_studies g
      WHERE c.study_id = g.id AND c.church_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_study_participants')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_studies') THEN
    UPDATE public.group_study_participants c SET church_id = v_legado FROM public.group_studies g
      WHERE c.study_id = g.id AND c.church_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_study_topics')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_studies') THEN
    UPDATE public.group_study_topics c SET church_id = v_legado FROM public.group_studies g
      WHERE c.study_id = g.id AND c.church_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_study_topic_replies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'group_study_topics') THEN
    UPDATE public.group_study_topic_replies r SET church_id = v_legado FROM public.group_study_topics t
      WHERE r.topic_id = t.id AND r.church_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'youth_profiles') THEN
    UPDATE public.youth_profiles y SET church_id = u.church_id FROM public.users u
      WHERE y.user_id = u.id AND y.church_id IS NULL;
    UPDATE public.youth_profiles SET church_id = v_legado WHERE church_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'spiritual_journey_profiles') THEN
    UPDATE public.spiritual_journey_profiles s SET church_id = u.church_id FROM public.users u
      WHERE s.user_id = u.id AND s.church_id IS NULL;
    UPDATE public.spiritual_journey_profiles SET church_id = v_legado WHERE church_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'spiritual_xp_events') THEN
    UPDATE public.spiritual_xp_events s SET church_id = u.church_id FROM public.users u
      WHERE s.user_id = u.id AND s.church_id IS NULL;
    UPDATE public.spiritual_xp_events SET church_id = v_legado WHERE church_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'spiritual_discipline_completions') THEN
    UPDATE public.spiritual_discipline_completions s SET church_id = u.church_id FROM public.users u
      WHERE s.user_id = u.id AND s.church_id IS NULL;
    UPDATE public.spiritual_discipline_completions SET church_id = v_legado WHERE church_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'spiritual_reflections') THEN
    UPDATE public.spiritual_reflections s SET church_id = u.church_id FROM public.users u
      WHERE s.user_id = u.id AND s.church_id IS NULL;
    UPDATE public.spiritual_reflections SET church_id = v_legado WHERE church_id IS NULL;
  END IF;
END;
$backfill_legado$;

-- event_visitors / convites / RSVPs: church_id a partir do evento (só se as tabelas existirem)
DO $sync_event_church$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_visitors')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
    UPDATE public.event_visitors ev
    SET church_id = e.church_id
    FROM public.events e
    WHERE ev.event_id = e.id AND ev.church_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visitor_checkin_invites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
    UPDATE public.visitor_checkin_invites i
    SET church_id = e.church_id
    FROM public.events e
    WHERE i.event_id = e.id AND i.church_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_rsvps')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
    UPDATE public.event_rsvps r
    SET church_id = e.church_id
    FROM public.events e
    WHERE r.event_id = e.id AND r.church_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_records')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
    UPDATE public.attendance_records a
    SET church_id = e.church_id
    FROM public.events e
    WHERE a.event_id = e.id AND a.church_id IS NULL AND e.church_id IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_registrations')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
    UPDATE public.event_registrations r
    SET church_id = e.church_id
    FROM public.events e
    WHERE r.event_id = e.id AND r.church_id IS NULL;
  END IF;
END;
$sync_event_church$;

-- 7) NOT NULL onde aplicável (só tabelas que existem e têm church_id)
DO $church_id_not_null$
DECLARE
  t text;
  nn_tables text[] := ARRAY[
    'events', 'devotionals', 'announcements', 'verse_of_week', 'community_posts', 'prayer_requests',
    'event_registrations', 'attendance_records', 'visitor_profiles', 'event_visitors', 'visitor_checkin_invites',
    'event_rsvps', 'notifications', 'achievements', 'achievement_definitions', 'group_studies',
    'spiritual_disciplines', 'ministries', 'ministry_tasks', 'ministry_agenda', 'ministry_members',
    'ministry_purposes', 'ministry_calendar_events', 'ministry_event_schedule', 'ministry_monthly_focus',
    'schedule_types', 'community_post_comments', 'prayer_request_comments', 'prayer_request_prayers',
    'group_study_comments', 'group_study_participants', 'group_study_topics', 'group_study_topic_replies',
    'youth_profiles', 'spiritual_journey_profiles', 'spiritual_xp_events', 'spiritual_discipline_completions',
    'spiritual_reflections'
  ];
BEGIN
  FOREACH t IN ARRAY nn_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    )
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t AND column_name = 'church_id'
       ) THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN church_id SET NOT NULL', t);
    END IF;
  END LOOP;
END;
$church_id_not_null$;

-- 8) ministries: unicidade por igreja
DO $ministries_unique$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ministries')
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'ministries' AND column_name = 'church_id'
     )
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'ministries' AND column_name = 'ministry_key'
     ) THEN
    ALTER TABLE public.ministries DROP CONSTRAINT IF EXISTS ministries_ministry_key_key;
    CREATE UNIQUE INDEX IF NOT EXISTS ministries_church_ministry_key_idx ON public.ministries (church_id, ministry_key);
  END IF;
END;
$ministries_unique$;

-- 9) schedule_types: unicidade por igreja
DO $schedule_types_unique$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schedule_types')
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'schedule_types' AND column_name = 'church_id'
     )
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'schedule_types' AND column_name = 'key'
     ) THEN
    ALTER TABLE public.schedule_types DROP CONSTRAINT IF EXISTS schedule_types_key_key;
    CREATE UNIQUE INDEX IF NOT EXISTS schedule_types_church_key_idx ON public.schedule_types (church_id, key);
  END IF;
END;
$schedule_types_unique$;

-- 10) app_settings modo provisão
INSERT INTO public.app_settings (key, value)
SELECT 'tenant_provisioning_mode', 'both'
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_settings')
  AND NOT EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'tenant_provisioning_mode');
