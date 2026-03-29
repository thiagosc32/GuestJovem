-- whatsapp_youth_count é específico por igreja; a clonagem inicial repetiu o valor legado (ex.: 165) em todas.
-- Limpa valores em linhas com church_id para cada admin indicar o número do seu grupo.
UPDATE public.app_settings
SET value = ''
WHERE key = 'whatsapp_youth_count'
  AND church_id IS NOT NULL;

-- Novas igrejas: não copiar o número WhatsApp da igreja legado (cada uma define o seu).
CREATE OR REPLACE FUNCTION public.seed_app_settings_for_church(p_church_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_legado uuid;
BEGIN
  SELECT id INTO v_legado FROM public.churches WHERE slug = 'legado' LIMIT 1;
  IF v_legado IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.app_settings (key, value, church_id)
  SELECT
    s.key,
    CASE
      WHEN s.key = 'whatsapp_youth_count' THEN ''
      ELSE s.value
    END,
    p_church_id
  FROM public.app_settings s
  WHERE s.church_id IS NOT DISTINCT FROM v_legado
    AND s.key IS DISTINCT FROM 'tenant_provisioning_mode'
    AND NOT EXISTS (
      SELECT 1 FROM public.app_settings x
      WHERE x.key = s.key AND x.church_id IS NOT DISTINCT FROM p_church_id
    );
END;
$$;
