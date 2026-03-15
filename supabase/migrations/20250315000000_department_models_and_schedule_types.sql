-- Modelos de departamento e novos tipos de cronograma: oração, organização, finanças.
-- Permite que cada departamento tenha um modelo (tipo de cronograma padrão) e que eventos usem cronogramas específicos.

-- 1. Tipo de cronograma padrão no ministério/departamento (modelo base)
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS default_schedule_type TEXT
  CHECK (default_schedule_type IS NULL OR default_schedule_type IN ('culto', 'midia', 'oracao', 'organizacao', 'financas'));

COMMENT ON COLUMN ministries.default_schedule_type IS 'Modelo do departamento: tipo de cronograma sugerido para eventos (culto, midia, oracao, organizacao, financas).';

-- 2. Expandir schedule_type nos eventos para oração, organização e finanças
ALTER TABLE ministry_calendar_events DROP CONSTRAINT IF EXISTS ministry_calendar_events_schedule_type_check;

ALTER TABLE ministry_calendar_events ADD CONSTRAINT ministry_calendar_events_schedule_type_check
  CHECK (schedule_type IS NULL OR schedule_type IN ('culto', 'midia', 'oracao', 'organizacao', 'financas'));

-- 3. Expandir step_type no cronograma do evento com etapas de oração, organização e finanças
ALTER TABLE ministry_event_schedule DROP CONSTRAINT IF EXISTS ministry_event_schedule_step_type_check;

ALTER TABLE ministry_event_schedule ADD CONSTRAINT ministry_event_schedule_step_type_check
  CHECK (step_type IN (
    -- culto
    'abertura', 'louvor', 'transicao', 'boas_vindas', 'ofertas', 'palavra', 'encerramento',
    -- midia
    'pre_culto', 'inicio_ambiente', 'louvor_registros', 'palavra_anotacoes', 'encerramento_gratidao',
    -- oracao
    'intercessao', 'encontros', 'vigilia', 'celula_oracao',
    -- organizacao
    'preparacao_org', 'recepcao', 'coordenacao', 'limpeza', 'encerramento_org',
    -- financas
    'planejamento_anual', 'revisao_mensal', 'revisao_trimestral', 'datas_chave', 'prestacao_contas'
  ));
