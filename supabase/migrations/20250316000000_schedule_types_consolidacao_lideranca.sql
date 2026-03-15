-- Inclui cronogramas Consolidação e Liderança em eventos e ministérios.

-- 1. ministries.default_schedule_type: permitir consolidacao e lideranca
ALTER TABLE ministries DROP CONSTRAINT IF EXISTS ministries_default_schedule_type_check;
ALTER TABLE ministries ADD CONSTRAINT ministries_default_schedule_type_check
  CHECK (default_schedule_type IS NULL OR default_schedule_type IN (
    'culto', 'midia', 'oracao', 'organizacao', 'financas', 'consolidacao', 'lideranca'
  ));

-- 2. ministry_calendar_events.schedule_type: permitir consolidacao e lideranca
ALTER TABLE ministry_calendar_events DROP CONSTRAINT IF EXISTS ministry_calendar_events_schedule_type_check;
ALTER TABLE ministry_calendar_events ADD CONSTRAINT ministry_calendar_events_schedule_type_check
  CHECK (schedule_type IS NULL OR schedule_type IN (
    'culto', 'midia', 'oracao', 'organizacao', 'financas', 'consolidacao', 'lideranca'
  ));

-- 3. ministry_event_schedule.step_type: incluir etapas de consolidação e liderança
ALTER TABLE ministry_event_schedule DROP CONSTRAINT IF EXISTS ministry_event_schedule_step_type_check;
ALTER TABLE ministry_event_schedule ADD CONSTRAINT ministry_event_schedule_step_type_check
  CHECK (step_type IN (
    'abertura', 'louvor', 'transicao', 'boas_vindas', 'ofertas', 'palavra', 'encerramento',
    'pre_culto', 'inicio_ambiente', 'louvor_registros', 'palavra_anotacoes', 'encerramento_gratidao',
    'intercessao', 'encontros', 'vigilia', 'celula_oracao',
    'preparacao_org', 'recepcao', 'coordenacao', 'limpeza', 'encerramento_org',
    'planejamento_anual', 'revisao_mensal', 'revisao_trimestral', 'datas_chave', 'prestacao_contas',
    'acolhimento_cons', 'acompanhamento', 'discipulado', 'revisita', 'integracao',
    'reuniao_lideranca', 'planejamento_lid', 'treinamento', 'avaliacao', 'delegacao'
  ));
