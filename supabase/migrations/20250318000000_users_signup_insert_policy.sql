-- Login e cadastro: políticas e trigger para perfil em public.users

-- 1) Política para o cliente inserir próprio perfil (quando não houver trigger ou como fallback)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_insert_own'
  ) THEN
    CREATE POLICY "users_insert_own" ON public.users
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 2) Trigger: ao criar usuário em auth.users, cria linha em public.users (nome vindo de raw_user_meta_data)
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
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1),
    'Usuário'
  );
  INSERT INTO public.users (id, email, name, role, created_at)
  VALUES (NEW.id, NEW.email, user_name, 'user', NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
