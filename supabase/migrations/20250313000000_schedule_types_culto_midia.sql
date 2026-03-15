-- Tipos de cronograma: culto (etapas atuais) e mídia (etapas específicas).

-- 1. Tipo de cronograma no evento
ALTER TABLE ministry_calendar_events ADD COLUMN IF NOT EXISTS schedule_type TEXT
  CHECK (schedule_type IS NULL OR schedule_type IN ('culto', 'midia'));

COMMENT ON COLUMN ministry_calendar_events.schedule_type IS 'Tipo de cronograma: culto (abertura, louvor, etc.) ou midia (pré-culto, início, etc.).';

-- 2. Expandir step_type para incluir etapas do cronograma mídia
ALTER TABLE ministry_event_schedule DROP CONSTRAINT IF EXISTS ministry_event_schedule_step_type_check;

ALTER TABLE ministry_event_schedule ADD CONSTRAINT ministry_event_schedule_step_type_check
  CHECK (step_type IN (
    'abertura', 'louvor', 'transicao', 'boas_vindas', 'ofertas', 'palavra', 'encerramento',
    'pre_culto', 'inicio_ambiente', 'louvor_registros', 'palavra_anotacoes', 'encerramento_gratidao'
  ));
