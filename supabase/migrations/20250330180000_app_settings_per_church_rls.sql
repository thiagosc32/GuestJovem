-- app_settings: escopo por igreja (versículos, banner, WhatsApp, etc.) + RLS.
-- Mantém apenas tenant_provisioning_mode como linha global (church_id NULL), para super_admin / RPCs.

-- 1) Colunas e nova PK
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS church_id uuid REFERENCES public.churches (id) ON DELETE CASCADE;

UPDATE public.app_settings SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE public.app_settings ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.app_settings ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.app_settings DROP CONSTRAINT IF EXISTS app_settings_pkey;

ALTER TABLE public.app_settings ADD PRIMARY KEY (id);

DROP INDEX IF EXISTS app_settings_global_key;
CREATE UNIQUE INDEX app_settings_global_key ON public.app_settings (key) WHERE church_id IS NULL;

DROP INDEX IF EXISTS app_settings_church_key;
CREATE UNIQUE INDEX app_settings_church_key ON public.app_settings (key, church_id) WHERE church_id IS NOT NULL;

-- 2) Clonar definições globais existentes para cada igreja (exceto chave de plataforma)
INSERT INTO public.app_settings (key, value, church_id)
SELECT s.key, s.value, c.id
FROM public.app_settings s
CROSS JOIN public.churches c
WHERE s.church_id IS NULL
  AND s.key IS DISTINCT FROM 'tenant_provisioning_mode'
  AND NOT EXISTS (
    SELECT 1 FROM public.app_settings x
    WHERE x.key = s.key AND x.church_id IS NOT DISTINCT FROM c.id
  );

DELETE FROM public.app_settings
WHERE church_id IS NULL
  AND key IS DISTINCT FROM 'tenant_provisioning_mode';

-- 3) RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_select ON public.app_settings;
CREATE POLICY app_settings_select ON public.app_settings
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (church_id IS NOT NULL AND public.tenant_row_visible(church_id))
  );

DROP POLICY IF EXISTS app_settings_insert ON public.app_settings;
CREATE POLICY app_settings_insert ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_church_admin() AND church_id IS NOT NULL AND public.tenant_row_visible(church_id))
  );

DROP POLICY IF EXISTS app_settings_update ON public.app_settings;
CREATE POLICY app_settings_update ON public.app_settings
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (public.is_church_admin() AND church_id IS NOT NULL AND public.tenant_row_visible(church_id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR (public.is_church_admin() AND church_id IS NOT NULL AND public.tenant_row_visible(church_id))
  );

DROP POLICY IF EXISTS app_settings_delete ON public.app_settings;
CREATE POLICY app_settings_delete ON public.app_settings
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- 4) RPCs que liam/alteravam tenant_provisioning_mode sem escopar linha global
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
  UPDATE public.app_settings
  SET value = p_mode
  WHERE key = 'tenant_provisioning_mode' AND church_id IS NULL;
  INSERT INTO public.app_settings (key, value, church_id)
  SELECT 'tenant_provisioning_mode', p_mode, NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings
    WHERE key = 'tenant_provisioning_mode' AND church_id IS NULL
  );
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
  SELECT value INTO v FROM public.app_settings
  WHERE key = 'tenant_provisioning_mode' AND church_id IS NULL
  LIMIT 1;
  RETURN json_build_object('mode', coalesce(v, 'both'));
END;
$$;

-- 5) Novas igrejas: copiar chaves de UI a partir da igreja legado (se existir)
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
  SELECT s.key, s.value, p_church_id
  FROM public.app_settings s
  WHERE s.church_id IS NOT DISTINCT FROM v_legado
    AND s.key IS DISTINCT FROM 'tenant_provisioning_mode'
    AND NOT EXISTS (
      SELECT 1 FROM public.app_settings x
      WHERE x.key = s.key AND x.church_id IS NOT DISTINCT FROM p_church_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_churches_seed_app_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_app_settings_for_church(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_churches_seed_app_settings ON public.churches;
CREATE TRIGGER trg_churches_seed_app_settings
  AFTER INSERT ON public.churches
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_churches_seed_app_settings();
