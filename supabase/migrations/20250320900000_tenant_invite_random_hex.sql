-- Códigos de convite aleatórios sem depender de pgcrypto/gen_random_bytes
-- (evita "function gen_random_bytes(integer) does not exist" em projetos sem extensão).

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
