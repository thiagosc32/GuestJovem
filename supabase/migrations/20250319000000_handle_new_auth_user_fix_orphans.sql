-- Corrige falhas no cadastro: "Database error saving new user"
-- Causa comum: UNIQUE(email) em public.users quando existe linha "órfã" (auth apagado, perfil ficou)
-- ou re-cadastro com o mesmo e-mail.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
BEGIN
  user_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Usuário'
  );

  -- Remove perfil órfão: mesmo e-mail mas sem linha correspondente em auth.users
  IF NEW.email IS NOT NULL THEN
    DELETE FROM public.users AS u
    WHERE u.email = NEW.email
      AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id);
  END IF;

  INSERT INTO public.users (id, email, name, role, created_at)
  VALUES (NEW.id, NEW.email, user_name, 'user', NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Cria/atualiza public.users ao inserir em auth.users; remove órfãos com mesmo e-mail para evitar UNIQUE violation.';
