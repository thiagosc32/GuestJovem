-- Remove as funções de liderança específicas; mantém apenas jovem, voluntário, staff, admin.

-- Atualiza usuários que tinham alguma das funções removidas para NULL (admin pode reatribuir depois)
UPDATE users
SET ministry_function = NULL
WHERE ministry_function IN (
  'lider_guest_fire',
  'lider_organizacao',
  'lider_midia',
  'lideranca_jovens',
  'lider_financeiro',
  'lider_consolidacao'
);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_ministry_function_check;

ALTER TABLE users ADD CONSTRAINT users_ministry_function_check
  CHECK (ministry_function IS NULL OR ministry_function IN ('jovem', 'voluntario', 'staff', 'admin'));
