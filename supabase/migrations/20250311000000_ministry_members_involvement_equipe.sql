-- Adiciona opção 'equipe' ao nível de envolvimento dos membros do ministério.

ALTER TABLE ministry_members DROP CONSTRAINT IF EXISTS ministry_members_involvement_level_check;

ALTER TABLE ministry_members ADD CONSTRAINT ministry_members_involvement_level_check
  CHECK (involvement_level IS NULL OR involvement_level IN ('apoio', 'ativo', 'equipe', 'lideranca'));
