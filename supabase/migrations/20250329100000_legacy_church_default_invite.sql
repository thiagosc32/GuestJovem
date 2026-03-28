-- Convite público fixo para a igreja legado (slug legado), se ainda não houver convite ativo.
-- Link típico: {EXPO_PUBLIC_WEB_URL}/convite/legado  (ou código alternativo se "legado" já estiver em uso)

DO $legacy_invite$
DECLARE
  v_cid uuid;
  v_code text := 'legado';
BEGIN
  SELECT id INTO v_cid FROM public.churches WHERE slug = 'legado' LIMIT 1;
  IF v_cid IS NULL THEN
    RAISE NOTICE 'legacy_invite: igreja com slug legado não encontrada (ignore se multi_tenant_schema ainda não correu).';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.church_invites
    WHERE church_id = v_cid
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RAISE NOTICE 'legacy_invite: igreja legado já tem convite(s) ativo(s).';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.church_invites WHERE lower(code) = lower(v_code)) THEN
    v_code := 'guestjovem-legado';
  END IF;

  IF EXISTS (SELECT 1 FROM public.church_invites WHERE lower(code) = lower(v_code)) THEN
    v_code := 'legado-' || public.tenant_invite_random_hex(16);
  END IF;

  INSERT INTO public.church_invites (church_id, code)
  VALUES (v_cid, v_code);
END;
$legacy_invite$;
