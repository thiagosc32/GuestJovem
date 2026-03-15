-- Funções de ministério atribuíveis pelos admins na gestão de usuários.
-- Mantém as existentes e adiciona as novas funções de liderança.

-- 1. Adicionar coluna ministry_function (função no ministério)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ministry_function TEXT;

-- 2. Constraint com todas as funções (antigas + novas)
DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ministry_function_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE users ADD CONSTRAINT users_ministry_function_check
  CHECK (ministry_function IS NULL OR ministry_function IN (
    'jovem',
    'voluntario',
    'staff',
    'admin',
    'lider_guest_fire',
    'lider_organizacao',
    'lider_midia',
    'lideranca_jovens',
    'lider_financeiro',
    'lider_consolidacao'
  ));

-- 3. Default para novos usuários sem função
COMMENT ON COLUMN users.ministry_function IS 'Função no ministério atribuída pelo admin: jovem, voluntário, staff, admin, ou uma das funções de liderança.';
