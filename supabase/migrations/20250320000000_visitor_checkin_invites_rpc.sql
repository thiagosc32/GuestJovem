-- Link exclusivo para check-in de visitantes + colunas do questionário.
-- Remove INSERT público direto em event_visitors; apenas RPC SECURITY DEFINER insere.

-- Novos campos em event_visitors
ALTER TABLE public.event_visitors
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS accepted_jesus BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS congregates BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS church_name TEXT;

COMMENT ON COLUMN public.event_visitors.phone IS 'Telefone opcional informado pelo visitante';
COMMENT ON COLUMN public.event_visitors.accepted_jesus IS 'Pergunta pastoral: já aceitou Jesus';
COMMENT ON COLUMN public.event_visitors.congregates IS 'Congrega em alguma igreja';
COMMENT ON COLUMN public.event_visitors.church_name IS 'Nome da igreja (se congregates = true)';

-- Convites com token opaco (não expor event_id na URL como único segredo)
CREATE TABLE IF NOT EXISTS public.visitor_checkin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_visitor_checkin_invites_event_id ON public.visitor_checkin_invites(event_id);
CREATE INDEX IF NOT EXISTS idx_visitor_checkin_invites_token ON public.visitor_checkin_invites(token);

COMMENT ON TABLE public.visitor_checkin_invites IS 'Link/QR exclusivo por evento para formulário público de visitante';

ALTER TABLE public.visitor_checkin_invites ENABLE ROW LEVEL SECURITY;

-- Sem políticas de SELECT/INSERT/UPDATE para anon/authenticated: acesso só via RPC ou service role.

-- Remover INSERT aberto (visitantes passam a usar visitor_checkin_submit)
DROP POLICY IF EXISTS "event_visitors_insert_allow" ON public.event_visitors;

-- Pré-visualização pública: valida token e devolve dados do evento
CREATE OR REPLACE FUNCTION public.visitor_checkin_preview(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.visitor_checkin_invites%ROWTYPE;
  ev RECORD;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 10 THEN
    RETURN json_build_object('valid', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO inv
  FROM public.visitor_checkin_invites
  WHERE token = trim(p_token)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'not_found');
  END IF;

  SELECT id, title, date INTO ev FROM public.events WHERE id = inv.event_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'event_missing');
  END IF;

  RETURN json_build_object(
    'valid', true,
    'event', json_build_object(
      'id', ev.id,
      'title', ev.title,
      'date', ev.date
    )
  );
END;
$$;

-- Submissão pública: valida token e insere em event_visitors
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
    church_name
  ) VALUES (
    inv.event_id,
    NULL,
    trim(p_name),
    COALESCE(p_is_first_time, true),
    false,
    nullif(trim(COALESCE(p_phone, '')), ''),
    COALESCE(p_accepted_jesus, false),
    COALESCE(p_congregates, false),
    v_church
  );

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Criar convite (apenas admin autenticado)
CREATE OR REPLACE FUNCTION public.visitor_checkin_invite_create(p_event_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = p_event_id) THEN
    RETURN json_build_object('success', false, 'error', 'event_not_found');
  END IF;

  v_token := gen_random_uuid()::text;

  INSERT INTO public.visitor_checkin_invites (event_id, token, created_by, is_active)
  VALUES (p_event_id, v_token, auth.uid(), true);

  RETURN json_build_object('success', true, 'token', v_token);
END;
$$;

GRANT EXECUTE ON FUNCTION public.visitor_checkin_preview(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_checkin_submit(text, text, boolean, text, boolean, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_checkin_invite_create(uuid) TO authenticated;
