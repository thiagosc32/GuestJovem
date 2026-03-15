-- ============================================================================
-- Contas de teste por etapa da Jornada Espiritual
-- Execute no SQL Editor do Supabase DEPOIS de criar os 5 usuários em
-- Authentication > Users > Add user (semente@conviva.com, raiz@conviva.com, etc.; senha: teste123).
-- ============================================================================

-- 1) Garantir linhas em public.users para cada e-mail (a partir de auth.users)
INSERT INTO public.users (id, email, name, role)
SELECT
  au.id,
  au.email,
  CASE au.email
    WHEN 'semente@conviva.com'  THEN 'Ouvir (teste)'
    WHEN 'raiz@conviva.com'     THEN 'Seguir (teste)'
    WHEN 'caule@conviva.com'     THEN 'Permanecer (teste)'
    WHEN 'fruto@conviva.com'     THEN 'Frutificar (teste)'
    WHEN 'colheita@conviva.com'  THEN 'Multiplicar (teste)'
    ELSE 'Usuário (teste)'
  END,
  'user'
FROM auth.users au
WHERE au.email IN (
  'semente@conviva.com',
  'raiz@conviva.com',
  'caule@conviva.com',
  'fruto@conviva.com',
  'colheita@conviva.com'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email;

-- 2) Perfis da jornada com total_xp/current_level por etapa (Semente=0, Raiz=100, Caule=300, Fruto=600, Colheita=1000)
INSERT INTO spiritual_journey_profiles (user_id, total_xp, current_level, streak_weeks, updated_at)
SELECT
  u.id,
  (CASE u.email
    WHEN 'semente@conviva.com'  THEN 0
    WHEN 'raiz@conviva.com'     THEN 100
    WHEN 'caule@conviva.com'   THEN 300
    WHEN 'fruto@conviva.com'   THEN 600
    WHEN 'colheita@conviva.com' THEN 1000
    ELSE 0
  END),
  (CASE u.email
    WHEN 'semente@conviva.com'  THEN 1
    WHEN 'raiz@conviva.com'     THEN 2
    WHEN 'caule@conviva.com'   THEN 3
    WHEN 'fruto@conviva.com'   THEN 4
    WHEN 'colheita@conviva.com' THEN 5
    ELSE 1
  END),
  0,
  now()
FROM public.users u
WHERE u.email IN (
  'semente@conviva.com',
  'raiz@conviva.com',
  'caule@conviva.com',
  'fruto@conviva.com',
  'colheita@conviva.com'
)
ON CONFLICT (user_id) DO UPDATE SET
  total_xp   = EXCLUDED.total_xp,
  current_level = EXCLUDED.current_level,
  updated_at = now();

-- 3) Garantir que cada conta de teste está no nível correto (por nome)
--    Use este UPDATE se as contas já existirem mas estiverem todas em Semente.
UPDATE spiritual_journey_profiles p
SET
  total_xp = (CASE u.email
    WHEN 'semente@conviva.com'  THEN 0
    WHEN 'raiz@conviva.com'     THEN 100
    WHEN 'caule@conviva.com'    THEN 300
    WHEN 'fruto@conviva.com'    THEN 600
    WHEN 'colheita@conviva.com' THEN 1000
    ELSE p.total_xp
  END),
  current_level = (CASE u.email
    WHEN 'semente@conviva.com'  THEN 1
    WHEN 'raiz@conviva.com'     THEN 2
    WHEN 'caule@conviva.com'    THEN 3
    WHEN 'fruto@conviva.com'    THEN 4
    WHEN 'colheita@conviva.com' THEN 5
    ELSE p.current_level
  END),
  updated_at = now()
FROM public.users u
WHERE p.user_id = u.id
  AND u.email IN (
    'semente@conviva.com',
    'raiz@conviva.com',
    'caule@conviva.com',
    'fruto@conviva.com',
    'colheita@conviva.com'
  );
