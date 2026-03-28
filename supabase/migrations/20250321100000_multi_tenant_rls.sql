-- Multi-tenant RLS: helpers + políticas por church_id (super_admin vê tudo).

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

CREATE OR REPLACE FUNCTION public.tenant_row_visible(p_church_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR (auth.uid() IS NOT NULL
        AND public.current_user_church_id() IS NOT NULL
        AND p_church_id IS NOT DISTINCT FROM public.current_user_church_id());
$$;

CREATE OR REPLACE FUNCTION public.is_church_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND (u.role = 'super_admin' OR u.role = 'admin')
  );
$$;

-- churches
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "churches_select" ON public.churches;
CREATE POLICY "churches_select" ON public.churches
  FOR SELECT TO authenticated
  USING (public.is_super_admin() OR id = public.current_user_church_id());

DROP POLICY IF EXISTS "churches_update_admin" ON public.churches;
CREATE POLICY "churches_update_admin" ON public.churches
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.church_id = churches.id
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.church_id = churches.id
      )
    )
  );

DROP POLICY IF EXISTS "churches_insert_super_admin" ON public.churches;
CREATE POLICY "churches_insert_super_admin" ON public.churches
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_super_admin()
    OR (
      public.current_user_church_id() IS NOT NULL
      AND church_id IS NOT DISTINCT FROM public.current_user_church_id()
    )
  );

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND (
      role = 'super_admin'
      OR church_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin())
  WITH CHECK (
    id = auth.uid()
    OR public.is_super_admin()
  );

-- events
DROP POLICY IF EXISTS "events_select_public" ON public.events;
CREATE POLICY "events_select_authenticated" ON public.events
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id));

DROP POLICY IF EXISTS "events_insert_authenticated" ON public.events;
DROP POLICY IF EXISTS "events_all_authenticated" ON public.events;

CREATE POLICY "events_insert_authenticated" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.tenant_row_visible(church_id));

CREATE POLICY "events_update_authenticated" ON public.events
  FOR UPDATE TO authenticated
  USING (public.tenant_row_visible(church_id))
  WITH CHECK (public.tenant_row_visible(church_id));

CREATE POLICY "events_delete_authenticated" ON public.events
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_church_admin()
      AND public.tenant_row_visible(church_id)
    )
  );

-- devotionals
ALTER TABLE public.devotionals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read devotionals" ON public.devotionals;
DROP POLICY IF EXISTS "Authenticated users can read devotionals" ON public.devotionals;
DROP POLICY IF EXISTS "Admins can manage devotionals" ON public.devotionals;
DROP POLICY IF EXISTS "Admins can delete devotionals" ON public.devotionals;

CREATE POLICY "devotionals_select" ON public.devotionals
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id));

CREATE POLICY "devotionals_insert" ON public.devotionals
  FOR INSERT TO authenticated
  WITH CHECK (public.is_church_admin() AND public.tenant_row_visible(church_id));

CREATE POLICY "devotionals_update" ON public.devotionals
  FOR UPDATE TO authenticated
  USING (public.is_church_admin() AND public.tenant_row_visible(church_id))
  WITH CHECK (public.is_church_admin() AND public.tenant_row_visible(church_id));

CREATE POLICY "devotionals_delete" ON public.devotionals
  FOR DELETE TO authenticated
  USING (public.is_church_admin() AND public.tenant_row_visible(church_id));

-- announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id));

-- verse_of_week
ALTER TABLE public.verse_of_week ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "verse_of_week_select" ON public.verse_of_week;
CREATE POLICY "verse_of_week_select" ON public.verse_of_week
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id));

-- attendance_records
DROP POLICY IF EXISTS "attendance_records_select_authenticated" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_insert_authenticated" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_records_delete_admin" ON public.attendance_records;

CREATE POLICY "attendance_records_select" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id));

CREATE POLICY "attendance_records_insert" ON public.attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (public.tenant_row_visible(church_id));

CREATE POLICY "attendance_records_delete_admin" ON public.attendance_records
  FOR DELETE TO authenticated
  USING (
    public.is_church_admin()
    AND public.tenant_row_visible(church_id)
  );

-- community_posts
DROP POLICY IF EXISTS "community_posts_select_moderated" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_insert_own" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_delete_own" ON public.community_posts;

CREATE POLICY "community_posts_select" ON public.community_posts
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id) AND is_moderated = true);

CREATE POLICY "community_posts_insert_own" ON public.community_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.tenant_row_visible(church_id)
  );

CREATE POLICY "community_posts_delete_own" ON public.community_posts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

-- community_post_comments
DROP POLICY IF EXISTS "community_post_comments_select" ON public.community_post_comments;
DROP POLICY IF EXISTS "community_post_comments_insert" ON public.community_post_comments;

CREATE POLICY "community_post_comments_select" ON public.community_post_comments
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id));

CREATE POLICY "community_post_comments_insert" ON public.community_post_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.tenant_row_visible(church_id));

DROP POLICY IF EXISTS "community_post_comments_update_own" ON public.community_post_comments;
DROP POLICY IF EXISTS "community_post_comments_delete_own" ON public.community_post_comments;

CREATE POLICY "community_post_comments_update_own" ON public.community_post_comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

CREATE POLICY "community_post_comments_delete_own" ON public.community_post_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

-- prayer_requests (mantém lógica pública + admin; restringe por igreja)
DROP POLICY IF EXISTS "prayer_requests_select" ON public.prayer_requests;
DROP POLICY IF EXISTS "prayer_requests_insert" ON public.prayer_requests;
DROP POLICY IF EXISTS "prayer_requests_update_own" ON public.prayer_requests;
DROP POLICY IF EXISTS "prayer_requests_update_admin_private" ON public.prayer_requests;
DROP POLICY IF EXISTS "prayer_requests_delete" ON public.prayer_requests;

CREATE POLICY "prayer_requests_select" ON public.prayer_requests
  FOR SELECT USING (
    public.tenant_row_visible(church_id)
    AND (
      is_public = true
      OR user_id = auth.uid()
      OR (
        is_public = false
        AND EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND (u.role = 'admin' OR u.role = 'super_admin')
            AND (u.role = 'super_admin' OR u.church_id = prayer_requests.church_id)
        )
      )
    )
  );

CREATE POLICY "prayer_requests_insert" ON public.prayer_requests
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.tenant_row_visible(church_id)
  );

CREATE POLICY "prayer_requests_update_own" ON public.prayer_requests
  FOR UPDATE USING (user_id = auth.uid() AND public.tenant_row_visible(church_id));

CREATE POLICY "prayer_requests_update_admin_private" ON public.prayer_requests
  FOR UPDATE USING (
    is_public = false
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.role = 'admin' OR u.role = 'super_admin')
        AND (u.role = 'super_admin' OR u.church_id = prayer_requests.church_id)
    )
  );

CREATE POLICY "prayer_requests_delete" ON public.prayer_requests
  FOR DELETE USING (user_id = auth.uid() AND public.tenant_row_visible(church_id));

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "users_select_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_any" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
DROP POLICY IF EXISTS "users_delete_own_notifications" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND public.tenant_row_visible(church_id)
  );

CREATE POLICY "notifications_insert_tenant" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.tenant_row_visible(church_id));

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

-- event_registrations
DROP POLICY IF EXISTS "event_registrations_select" ON public.event_registrations;
DROP POLICY IF EXISTS "event_registrations_insert" ON public.event_registrations;
DROP POLICY IF EXISTS "event_registrations_update" ON public.event_registrations;

CREATE POLICY "event_registrations_select" ON public.event_registrations
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id));

CREATE POLICY "event_registrations_insert" ON public.event_registrations
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "event_registrations_update" ON public.event_registrations
  FOR UPDATE TO authenticated
  USING (public.is_church_admin() AND public.tenant_row_visible(church_id));

-- event_rsvps
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_rsvps_select" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_insert" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_update" ON public.event_rsvps;
DROP POLICY IF EXISTS "event_rsvps_delete" ON public.event_rsvps;

CREATE POLICY "event_rsvps_all" ON public.event_rsvps
  FOR ALL TO authenticated
  USING (public.tenant_row_visible(church_id))
  WITH CHECK (public.tenant_row_visible(church_id));

-- event_visitors
DROP POLICY IF EXISTS "event_visitors_select_authenticated" ON public.event_visitors;
DROP POLICY IF EXISTS "event_visitors_delete_authenticated" ON public.event_visitors;

CREATE POLICY "event_visitors_select" ON public.event_visitors
  FOR SELECT TO authenticated
  USING (public.is_church_admin() AND public.tenant_row_visible(church_id));

CREATE POLICY "event_visitors_delete" ON public.event_visitors
  FOR DELETE TO authenticated
  USING (public.is_church_admin() AND public.tenant_row_visible(church_id));

-- visitor_profiles
DROP POLICY IF EXISTS "visitor_profiles_select" ON public.visitor_profiles;
DROP POLICY IF EXISTS "visitor_profiles_insert" ON public.visitor_profiles;
DROP POLICY IF EXISTS "visitor_profiles_update" ON public.visitor_profiles;

CREATE POLICY "visitor_profiles_tenant" ON public.visitor_profiles
  FOR ALL TO authenticated
  USING (public.tenant_row_visible(church_id))
  WITH CHECK (public.tenant_row_visible(church_id));

-- achievements / achievement_definitions (tabelas opcionais: migração antiga pode não ter corrido)
DO $ach_rls$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'achievements'
  ) THEN
    ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "achievements_select" ON public.achievements;
    CREATE POLICY "achievements_select" ON public.achievements
      FOR SELECT TO authenticated
      USING (public.tenant_row_visible(church_id));

    CREATE POLICY "achievements_write" ON public.achievements
      FOR INSERT TO authenticated
      WITH CHECK (public.tenant_row_visible(church_id) AND auth.uid() = user_id);

    CREATE POLICY "achievements_update" ON public.achievements
      FOR UPDATE TO authenticated
      USING (public.tenant_row_visible(church_id) AND auth.uid() = user_id);

    CREATE POLICY "achievements_delete" ON public.achievements
      FOR DELETE TO authenticated
      USING (public.tenant_row_visible(church_id) AND auth.uid() = user_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'achievement_definitions'
  ) THEN
    ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Achievement definitions readable by authenticated" ON public.achievement_definitions;
    DROP POLICY IF EXISTS "Only admins manage achievement definitions" ON public.achievement_definitions;

    CREATE POLICY "achievement_definitions_select" ON public.achievement_definitions
      FOR SELECT TO authenticated
      USING (public.tenant_row_visible(church_id));

    CREATE POLICY "achievement_definitions_write" ON public.achievement_definitions
      FOR ALL TO authenticated
      USING (public.is_church_admin() AND public.tenant_row_visible(church_id))
      WITH CHECK (public.is_church_admin() AND public.tenant_row_visible(church_id));
  END IF;
END;
$ach_rls$;

-- group studies
DROP POLICY IF EXISTS "group_studies_select_authenticated" ON public.group_studies;
DROP POLICY IF EXISTS "group_studies_insert_own" ON public.group_studies;
DROP POLICY IF EXISTS "group_studies_update_own" ON public.group_studies;
DROP POLICY IF EXISTS "group_studies_delete_own" ON public.group_studies;

CREATE POLICY "group_studies_select" ON public.group_studies
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id));

CREATE POLICY "group_studies_insert_own" ON public.group_studies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.tenant_row_visible(church_id));

CREATE POLICY "group_studies_update_own" ON public.group_studies
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

CREATE POLICY "group_studies_delete_own" ON public.group_studies
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

-- group_study_comments + participants + topics + replies
DROP POLICY IF EXISTS "group_study_comments_select" ON public.group_study_comments;
DROP POLICY IF EXISTS "group_study_comments_insert_own" ON public.group_study_comments;
DROP POLICY IF EXISTS "group_study_comments_update_own" ON public.group_study_comments;
DROP POLICY IF EXISTS "group_study_comments_delete_own" ON public.group_study_comments;

CREATE POLICY "group_study_comments_select" ON public.group_study_comments
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id));

CREATE POLICY "group_study_comments_insert" ON public.group_study_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.tenant_row_visible(church_id));

CREATE POLICY "group_study_comments_update" ON public.group_study_comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

CREATE POLICY "group_study_comments_delete" ON public.group_study_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

DROP POLICY IF EXISTS "participants_select_authenticated" ON public.group_study_participants;
DROP POLICY IF EXISTS "participants_insert_own" ON public.group_study_participants;
DROP POLICY IF EXISTS "participants_delete_own" ON public.group_study_participants;

CREATE POLICY "group_study_participants_select" ON public.group_study_participants
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id));

CREATE POLICY "group_study_participants_insert" ON public.group_study_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    public.tenant_row_visible(church_id)
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.group_studies s
        WHERE s.id = study_id AND s.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "group_study_participants_delete" ON public.group_study_participants
  FOR DELETE TO authenticated
  USING (
    public.tenant_row_visible(church_id)
    AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.group_studies s
        WHERE s.id = study_id AND s.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "topics_select_authenticated" ON public.group_study_topics;
DROP POLICY IF EXISTS "topics_insert_own" ON public.group_study_topics;
DROP POLICY IF EXISTS "topics_update_own" ON public.group_study_topics;
DROP POLICY IF EXISTS "topics_delete_own" ON public.group_study_topics;
DROP POLICY IF EXISTS "topics_insert_creator_only" ON public.group_study_topics;

CREATE POLICY "group_study_topics_select" ON public.group_study_topics
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id));

CREATE POLICY "group_study_topics_insert" ON public.group_study_topics
  FOR INSERT TO authenticated
  WITH CHECK (
    public.tenant_row_visible(church_id)
    AND EXISTS (
      SELECT 1 FROM public.group_studies s
      WHERE s.id = study_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "group_study_topics_update_own" ON public.group_study_topics
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

CREATE POLICY "group_study_topics_delete_own" ON public.group_study_topics
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

DROP POLICY IF EXISTS "topic_replies_select_authenticated" ON public.group_study_topic_replies;
DROP POLICY IF EXISTS "topic_replies_insert_own" ON public.group_study_topic_replies;
DROP POLICY IF EXISTS "topic_replies_update_own" ON public.group_study_topic_replies;
DROP POLICY IF EXISTS "topic_replies_delete_own" ON public.group_study_topic_replies;

CREATE POLICY "group_study_topic_replies_select" ON public.group_study_topic_replies
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id));

CREATE POLICY "group_study_topic_replies_insert" ON public.group_study_topic_replies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.tenant_row_visible(church_id));

CREATE POLICY "group_study_topic_replies_update" ON public.group_study_topic_replies
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

CREATE POLICY "group_study_topic_replies_delete" ON public.group_study_topic_replies
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

-- spiritual_* + youth_profiles
ALTER TABLE public.youth_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "youth_profiles_tenant" ON public.youth_profiles;
CREATE POLICY "youth_profiles_select" ON public.youth_profiles
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = youth_profiles.user_id
        AND u.church_id IS NOT DISTINCT FROM public.current_user_church_id()
    )
  );

CREATE POLICY "youth_profiles_insert" ON public.youth_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.tenant_row_visible(church_id)
  );

CREATE POLICY "youth_profiles_update" ON public.youth_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id))
  WITH CHECK (auth.uid() = user_id AND public.tenant_row_visible(church_id));

CREATE POLICY "youth_profiles_delete" ON public.youth_profiles
  FOR DELETE TO authenticated
  USING (public.is_super_admin() OR (auth.uid() = user_id AND public.tenant_row_visible(church_id)));

ALTER TABLE public.spiritual_journey_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spiritual_journey_profiles_tenant" ON public.spiritual_journey_profiles
  FOR ALL TO authenticated
  USING (public.tenant_row_visible(church_id))
  WITH CHECK (public.tenant_row_visible(church_id));

ALTER TABLE public.spiritual_xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spiritual_xp_events_tenant" ON public.spiritual_xp_events
  FOR ALL TO authenticated
  USING (public.tenant_row_visible(church_id))
  WITH CHECK (public.tenant_row_visible(church_id));

ALTER TABLE public.spiritual_disciplines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spiritual_disciplines_tenant" ON public.spiritual_disciplines
  FOR ALL TO authenticated
  USING (public.tenant_row_visible(church_id))
  WITH CHECK (public.tenant_row_visible(church_id));

ALTER TABLE public.spiritual_discipline_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spiritual_discipline_completions_tenant" ON public.spiritual_discipline_completions
  FOR ALL TO authenticated
  USING (public.tenant_row_visible(church_id))
  WITH CHECK (public.tenant_row_visible(church_id));

ALTER TABLE public.spiritual_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spiritual_reflections_tenant" ON public.spiritual_reflections
  FOR ALL TO authenticated
  USING (public.tenant_row_visible(church_id))
  WITH CHECK (public.tenant_row_visible(church_id));

-- ministries family + schedule_types (cada tabela só se existir — migrações antigas opcionais)
DO $rls_ministries_family$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ministries') THEN
    ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ministries_select_authenticated" ON public.ministries;
    DROP POLICY IF EXISTS "ministries_insert_admin" ON public.ministries;
    DROP POLICY IF EXISTS "ministries_update_admin" ON public.ministries;
    DROP POLICY IF EXISTS "ministries_delete_admin" ON public.ministries;

    CREATE POLICY "ministries_select" ON public.ministries
      FOR SELECT TO authenticated
      USING (public.tenant_row_visible(church_id));

    CREATE POLICY "ministries_write" ON public.ministries
      FOR ALL TO authenticated
      USING (public.is_church_admin() AND public.tenant_row_visible(church_id))
      WITH CHECK (public.is_church_admin() AND public.tenant_row_visible(church_id));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ministry_tasks') THEN
    ALTER TABLE public.ministry_tasks ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ministry_tasks_select_authenticated" ON public.ministry_tasks;
    DROP POLICY IF EXISTS "ministry_tasks_insert_authenticated" ON public.ministry_tasks;
    DROP POLICY IF EXISTS "ministry_tasks_update_authenticated" ON public.ministry_tasks;
    DROP POLICY IF EXISTS "ministry_tasks_delete_authenticated" ON public.ministry_tasks;

    CREATE POLICY "ministry_tasks_tenant" ON public.ministry_tasks
      FOR ALL TO authenticated
      USING (public.tenant_row_visible(church_id))
      WITH CHECK (public.tenant_row_visible(church_id));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ministry_agenda') THEN
    ALTER TABLE public.ministry_agenda ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ministry_agenda_select_authenticated" ON public.ministry_agenda;
    DROP POLICY IF EXISTS "ministry_agenda_insert_authenticated" ON public.ministry_agenda;
    DROP POLICY IF EXISTS "ministry_agenda_update_authenticated" ON public.ministry_agenda;
    DROP POLICY IF EXISTS "ministry_agenda_delete_authenticated" ON public.ministry_agenda;

    CREATE POLICY "ministry_agenda_tenant" ON public.ministry_agenda
      FOR ALL TO authenticated
      USING (public.tenant_row_visible(church_id))
      WITH CHECK (public.tenant_row_visible(church_id));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ministry_members') THEN
    ALTER TABLE public.ministry_members ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ministry_members_select_authenticated" ON public.ministry_members;
    DROP POLICY IF EXISTS "ministry_members_insert_authenticated" ON public.ministry_members;
    DROP POLICY IF EXISTS "ministry_members_update_authenticated" ON public.ministry_members;
    DROP POLICY IF EXISTS "ministry_members_delete_authenticated" ON public.ministry_members;

    CREATE POLICY "ministry_members_tenant" ON public.ministry_members
      FOR ALL TO authenticated
      USING (public.tenant_row_visible(church_id))
      WITH CHECK (public.tenant_row_visible(church_id));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ministry_purposes') THEN
    ALTER TABLE public.ministry_purposes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ministry_purposes_select_authenticated" ON public.ministry_purposes;
    DROP POLICY IF EXISTS "ministry_purposes_insert_authenticated" ON public.ministry_purposes;
    DROP POLICY IF EXISTS "ministry_purposes_update_authenticated" ON public.ministry_purposes;

    CREATE POLICY "ministry_purposes_tenant" ON public.ministry_purposes
      FOR ALL TO authenticated
      USING (public.tenant_row_visible(church_id))
      WITH CHECK (public.tenant_row_visible(church_id));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ministry_calendar_events') THEN
    ALTER TABLE public.ministry_calendar_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ministry_calendar_events_select" ON public.ministry_calendar_events;
    DROP POLICY IF EXISTS "ministry_calendar_events_insert" ON public.ministry_calendar_events;
    DROP POLICY IF EXISTS "ministry_calendar_events_update" ON public.ministry_calendar_events;
    DROP POLICY IF EXISTS "ministry_calendar_events_delete" ON public.ministry_calendar_events;

    CREATE POLICY "ministry_calendar_events_tenant" ON public.ministry_calendar_events
      FOR ALL TO authenticated
      USING (public.tenant_row_visible(church_id))
      WITH CHECK (public.tenant_row_visible(church_id));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ministry_event_schedule') THEN
    ALTER TABLE public.ministry_event_schedule ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ministry_event_schedule_select" ON public.ministry_event_schedule;
    DROP POLICY IF EXISTS "ministry_event_schedule_insert" ON public.ministry_event_schedule;
    DROP POLICY IF EXISTS "ministry_event_schedule_update" ON public.ministry_event_schedule;
    DROP POLICY IF EXISTS "ministry_event_schedule_delete" ON public.ministry_event_schedule;

    CREATE POLICY "ministry_event_schedule_tenant" ON public.ministry_event_schedule
      FOR ALL TO authenticated
      USING (public.tenant_row_visible(church_id))
      WITH CHECK (public.tenant_row_visible(church_id));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ministry_monthly_focus') THEN
    ALTER TABLE public.ministry_monthly_focus ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ministry_monthly_focus_select_authenticated" ON public.ministry_monthly_focus;
    DROP POLICY IF EXISTS "ministry_monthly_focus_insert_authenticated" ON public.ministry_monthly_focus;
    DROP POLICY IF EXISTS "ministry_monthly_focus_update_authenticated" ON public.ministry_monthly_focus;
    DROP POLICY IF EXISTS "ministry_monthly_focus_delete_authenticated" ON public.ministry_monthly_focus;

    CREATE POLICY "ministry_monthly_focus_tenant" ON public.ministry_monthly_focus
      FOR ALL TO authenticated
      USING (public.tenant_row_visible(church_id))
      WITH CHECK (public.tenant_row_visible(church_id));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schedule_types') THEN
    ALTER TABLE public.schedule_types ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "schedule_types_select" ON public.schedule_types;
    DROP POLICY IF EXISTS "schedule_types_insert_admin" ON public.schedule_types;
    DROP POLICY IF EXISTS "schedule_types_update_admin" ON public.schedule_types;
    DROP POLICY IF EXISTS "schedule_types_delete_admin" ON public.schedule_types;

    CREATE POLICY "schedule_types_select" ON public.schedule_types
      FOR SELECT TO authenticated
      USING (public.tenant_row_visible(church_id));

    CREATE POLICY "schedule_types_write" ON public.schedule_types
      FOR ALL TO authenticated
      USING (public.is_church_admin() AND public.tenant_row_visible(church_id))
      WITH CHECK (public.is_church_admin() AND public.tenant_row_visible(church_id));
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schedule_type_steps')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schedule_types') THEN
    ALTER TABLE public.schedule_type_steps ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "schedule_type_steps_select" ON public.schedule_type_steps;
    DROP POLICY IF EXISTS "schedule_type_steps_insert_admin" ON public.schedule_type_steps;
    DROP POLICY IF EXISTS "schedule_type_steps_update_admin" ON public.schedule_type_steps;
    DROP POLICY IF EXISTS "schedule_type_steps_delete_admin" ON public.schedule_type_steps;

    CREATE POLICY "schedule_type_steps_select" ON public.schedule_type_steps
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.schedule_types st
          WHERE st.id = schedule_type_steps.schedule_type_id
            AND public.tenant_row_visible(st.church_id)
        )
      );

    CREATE POLICY "schedule_type_steps_write" ON public.schedule_type_steps
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.schedule_types st
          WHERE st.id = schedule_type_steps.schedule_type_id
            AND public.is_church_admin()
            AND public.tenant_row_visible(st.church_id)
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.schedule_types st
          WHERE st.id = schedule_type_steps.schedule_type_id
            AND public.is_church_admin()
            AND public.tenant_row_visible(st.church_id)
        )
      );
  END IF;
END;
$rls_ministries_family$;

-- prayer_request_comments / prayers
DROP POLICY IF EXISTS "Ver comentários de pedidos públicos" ON public.prayer_request_comments;
DROP POLICY IF EXISTS "Inserir comentário autenticado" ON public.prayer_request_comments;

CREATE POLICY "prayer_request_comments_select" ON public.prayer_request_comments
  FOR SELECT TO authenticated
  USING (public.tenant_row_visible(church_id));

CREATE POLICY "prayer_request_comments_insert" ON public.prayer_request_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.tenant_row_visible(church_id));

DROP POLICY IF EXISTS "prayer_request_comments_update_own" ON public.prayer_request_comments;
DROP POLICY IF EXISTS "prayer_request_comments_delete_own" ON public.prayer_request_comments;

CREATE POLICY "prayer_request_comments_update_own" ON public.prayer_request_comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

CREATE POLICY "prayer_request_comments_delete_own" ON public.prayer_request_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.tenant_row_visible(church_id));

DROP POLICY IF EXISTS "Ver próprias orações" ON public.prayer_request_prayers;
DROP POLICY IF EXISTS "Inserir própria oração" ON public.prayer_request_prayers;
DROP POLICY IF EXISTS "Remover própria oração" ON public.prayer_request_prayers;

CREATE POLICY "prayer_request_prayers_all" ON public.prayer_request_prayers
  FOR ALL TO authenticated
  USING (public.tenant_row_visible(church_id))
  WITH CHECK (public.tenant_row_visible(church_id) AND auth.uid() = user_id);
