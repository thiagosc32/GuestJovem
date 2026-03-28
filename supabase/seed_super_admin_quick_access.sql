-- =============================================================================
-- Super admin para o atalho no app: superadmin@conviva.com / superadmin123
-- =============================================================================
-- Cole TUDO no Supabase → SQL Editor → Run (uma vez).
-- Isto cria (ou corrige) o utilizador em auth + identity e define role na app.
--
-- AVISO: senha fixa — só para desenvolvimento / staging. Não uses em produção
-- pública sem alterar a password depois do primeiro login.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_email text := 'superadmin@conviva.com';
  v_pass  text := 'superadmin123';
  v_id    uuid;
  v_iid   uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE lower(email) = lower(v_email) LIMIT 1;

  IF v_id IS NULL THEN
    SELECT instance_id INTO v_iid FROM auth.users LIMIT 1;
    IF v_iid IS NULL THEN
      v_iid := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;

    v_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      v_iid,
      v_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_pass, gen_salt('bf')),
      timezone('utc'::text, now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Super Admin (teste)"}'::jsonb,
      timezone('utc'::text, now()),
      timezone('utc'::text, now()),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email),
      'email',
      v_id::text,
      timezone('utc'::text, now()),
      timezone('utc'::text, now()),
      timezone('utc'::text, now())
    );
  ELSE
    -- Já existe em Auth: alinhar senha, e-mail confirmado e identity (falta disto quebra o login)
    UPDATE auth.users
    SET
      encrypted_password = crypt(v_pass, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, timezone('utc'::text, now())),
      confirmation_token = NULL,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_id;

    IF NOT EXISTS (
      SELECT 1 FROM auth.identities
      WHERE user_id = v_id AND provider = 'email'
    ) THEN
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_id,
        jsonb_build_object('sub', v_id::text, 'email', v_email),
        'email',
        v_id::text,
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
      );
    END IF;
  END IF;

  -- Perfil da app (o trigger pode já ter criado a linha)
  INSERT INTO public.users (id, email, name, role, church_id, created_at)
  SELECT
    v_id,
    v_email,
    'Super Admin (teste)',
    'super_admin',
    NULL,
    timezone('utc'::text, now())
  WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_id);

  UPDATE public.users
  SET
    role = 'super_admin',
    church_id = NULL,
    email = v_email,
    name = COALESCE(NULLIF(trim(name), ''), 'Super Admin (teste)')
  WHERE id = v_id;
END;
$$;
