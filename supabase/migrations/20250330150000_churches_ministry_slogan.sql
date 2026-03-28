-- Slogan do ministério (subtítulo no login por convite + editável em Identidade da igreja).

ALTER TABLE public.churches
  ADD COLUMN IF NOT EXISTS ministry_slogan text;

COMMENT ON COLUMN public.churches.ministry_slogan IS
  'Frase curta abaixo do nome do ministério (ex.: tela de login com convite).';

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

  SELECT
    ch.id,
    ch.name,
    ch.ministry_name,
    ch.ministry_slogan,
    ch.logo_url,
    ch.primary_color,
    ch.secondary_color,
    ch.status
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
      'ministry_slogan', r.ministry_slogan,
      'logo_url', r.logo_url,
      'primary_color', r.primary_color,
      'secondary_color', r.secondary_color
    )
  );
END;
$$;

DROP FUNCTION IF EXISTS public.church_admin_update_branding(text, text, text, text);

CREATE OR REPLACE FUNCTION public.church_admin_update_branding(
  p_ministry_name text DEFAULT NULL,
  p_ministry_slogan text DEFAULT NULL,
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
    ministry_slogan = CASE
      WHEN p_ministry_slogan IS NOT NULL THEN nullif(trim(p_ministry_slogan), '')
      ELSE ministry_slogan
    END,
    logo_url = CASE WHEN p_logo_url IS NOT NULL THEN nullif(trim(p_logo_url), '') ELSE logo_url END,
    primary_color = COALESCE(nullif(trim(p_primary_color), ''), primary_color),
    secondary_color = COALESCE(nullif(trim(p_secondary_color), ''), secondary_color)
  WHERE id = v_cid;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.church_admin_update_branding(text, text, text, text, text) TO authenticated;
