-- Lista de jovens ativos no período (para admin): last_active, presença ou XP.
-- SECURITY DEFINER para ler todas as tabelas independente de RLS.

CREATE OR REPLACE FUNCTION get_active_youth_list(days_back integer DEFAULT 30)
RETURNS TABLE (id uuid, name text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH since AS (
    SELECT (now() - (days_back || ' days')::interval)::timestamptz AS t
  ),
  youth AS (
    SELECT u.id FROM users u WHERE u.role IS DISTINCT FROM 'admin'
  ),
  active_ids AS (
    SELECT u.id FROM users u
    INNER JOIN youth y ON y.id = u.id
    WHERE u.last_active >= (SELECT t FROM since)
    UNION
    SELECT ar.user_id
    FROM since s
    JOIN attendance_records ar ON ar.check_in_time >= s.t
    INNER JOIN youth y ON y.id = ar.user_id
    UNION
    SELECT e.user_id
    FROM since s
    JOIN spiritual_xp_events e ON e.created_at >= s.t
    INNER JOIN youth y ON y.id = e.user_id
  ),
  distinct_active AS (
    SELECT DISTINCT id FROM active_ids
  )
  SELECT u.id, COALESCE(u.name, 'Sem nome'), u.avatar_url
  FROM users u
  INNER JOIN distinct_active a ON a.id = u.id
  ORDER BY u.name NULLS LAST;
$$;

COMMENT ON FUNCTION get_active_youth_list(integer) IS 'Admin: lista jovens ativos (last_active, presença ou XP) no período em dias.';
