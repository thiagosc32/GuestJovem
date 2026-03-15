-- Lista de usuários que concluíram devocionais no período, com quantidade por pessoa (para admin).
-- SECURITY DEFINER para ler spiritual_xp_events de todos os usuários, independente de RLS.
-- DROP necessário quando o tipo de retorno muda (PostgreSQL não permite ALTER apenas do retorno).

DROP FUNCTION IF EXISTS get_devotional_completions_list(integer);

CREATE OR REPLACE FUNCTION get_devotional_completions_list(days_back integer DEFAULT 30)
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
    FROM spiritual_xp_events e, since s
    WHERE e.action_type = 'devotional'
      AND e.created_at >= s.t
    GROUP BY e.user_id
  )
  SELECT u.id, COALESCE(u.name, 'Sem nome'), u.avatar_url, c.cnt AS completions_count
  FROM users u
  INNER JOIN counts c ON c.user_id = u.id
  WHERE u.role IS DISTINCT FROM 'admin'
  ORDER BY c.cnt DESC, u.name NULLS LAST;
$$;

COMMENT ON FUNCTION get_devotional_completions_list(integer) IS 'Admin: lista pessoas com quantidade de devocionais concluídos no período (dias).';
