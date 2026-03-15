-- Tabelas para CRUD de tipos de escala (cronogramas) por admins.
-- schedule_types: definição de cada tipo (culto, mídia, oração, etc.)
-- schedule_type_steps: etapas de cada tipo (abertura, louvor, etc.)

CREATE TABLE IF NOT EXISTS schedule_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_type_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_type_id UUID NOT NULL REFERENCES schedule_types(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_type_id, step_type)
);

CREATE INDEX IF NOT EXISTS idx_schedule_type_steps_type ON schedule_type_steps(schedule_type_id);

ALTER TABLE schedule_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_type_steps ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado
CREATE POLICY "schedule_types_select" ON schedule_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "schedule_type_steps_select" ON schedule_type_steps FOR SELECT TO authenticated USING (true);

-- Inserir/atualizar/excluir: apenas admin
CREATE POLICY "schedule_types_insert_admin" ON schedule_types FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "schedule_types_update_admin" ON schedule_types FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "schedule_types_delete_admin" ON schedule_types FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "schedule_type_steps_insert_admin" ON schedule_type_steps FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "schedule_type_steps_update_admin" ON schedule_type_steps FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "schedule_type_steps_delete_admin" ON schedule_type_steps FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Permitir qualquer step_type em ministry_event_schedule (para etapas criadas pelo admin)
ALTER TABLE ministry_event_schedule DROP CONSTRAINT IF EXISTS ministry_event_schedule_step_type_check;

-- Seed: tipos e etapas atuais (igual às constantes do app)
INSERT INTO schedule_types (key, label, sort_order) VALUES
  ('culto', 'Escala culto', 1),
  ('midia', 'Escala mídia', 2),
  ('oracao', 'Escala oração', 3),
  ('organizacao', 'Escala organização', 4),
  ('financas', 'Escala finanças', 5),
  ('consolidacao', 'Escala consolidação', 6),
  ('lideranca', 'Escala liderança', 7)
ON CONFLICT (key) DO NOTHING;

-- Seed: etapas do culto
INSERT INTO schedule_type_steps (schedule_type_id, step_type, label, description, sort_order)
SELECT id, 'abertura', 'Abertura', NULL, 1 FROM schedule_types WHERE key = 'culto'
UNION ALL SELECT id, 'louvor', 'Louvor', NULL, 2 FROM schedule_types WHERE key = 'culto'
UNION ALL SELECT id, 'transicao', 'Transição', NULL, 3 FROM schedule_types WHERE key = 'culto'
UNION ALL SELECT id, 'boas_vindas', 'Boas vindas', NULL, 4 FROM schedule_types WHERE key = 'culto'
UNION ALL SELECT id, 'ofertas', 'Ofertas', NULL, 5 FROM schedule_types WHERE key = 'culto'
UNION ALL SELECT id, 'palavra', 'Palavra', NULL, 6 FROM schedule_types WHERE key = 'culto'
UNION ALL SELECT id, 'encerramento', 'Encerramento', NULL, 7 FROM schedule_types WHERE key = 'culto'
ON CONFLICT (schedule_type_id, step_type) DO NOTHING;

-- Seed: etapas mídia
INSERT INTO schedule_type_steps (schedule_type_id, step_type, label, description, sort_order)
SELECT id, 'pre_culto', 'Pré-culto', 'Stories de expectativa, ambiente sendo preparado', 1 FROM schedule_types WHERE key = 'midia'
UNION ALL SELECT id, 'inicio_ambiente', 'Início / Ambiente', 'Story curto do culto começando + foto geral', 2 FROM schedule_types WHERE key = 'midia'
UNION ALL SELECT id, 'louvor_registros', 'Louvor (registros leves)', 'Sem close, sem excesso', 3 FROM schedule_types WHERE key = 'midia'
UNION ALL SELECT id, 'palavra_anotacoes', 'Palavra (anotações)', 'Anotar frases → não postar', 4 FROM schedule_types WHERE key = 'midia'
UNION ALL SELECT id, 'encerramento_gratidao', 'Encerramento / Gratidão', 'Story final + foto do ambiente', 5 FROM schedule_types WHERE key = 'midia'
ON CONFLICT (schedule_type_id, step_type) DO NOTHING;

-- Seed: oração, organização, finanças, consolidação, liderança (uma query por tipo)
INSERT INTO schedule_type_steps (schedule_type_id, step_type, label, description, sort_order)
SELECT id, 'intercessao', 'Intercessão', 'Momento de oração intercessória', 1 FROM schedule_types WHERE key = 'oracao'
UNION ALL SELECT id, 'encontros', 'Encontros', 'Encontros de oração / células', 2 FROM schedule_types WHERE key = 'oracao'
UNION ALL SELECT id, 'vigilia', 'Vigília', 'Vigílias e noites de oração', 3 FROM schedule_types WHERE key = 'oracao'
UNION ALL SELECT id, 'celula_oracao', 'Célula de oração', 'Reuniões em pequenos grupos', 4 FROM schedule_types WHERE key = 'oracao'
ON CONFLICT (schedule_type_id, step_type) DO NOTHING;

INSERT INTO schedule_type_steps (schedule_type_id, step_type, label, description, sort_order)
SELECT id, 'preparacao_org', 'Preparação', 'Preparação do ambiente e estrutura', 1 FROM schedule_types WHERE key = 'organizacao'
UNION ALL SELECT id, 'recepcao', 'Recepção', 'Recepção e acolhimento', 2 FROM schedule_types WHERE key = 'organizacao'
UNION ALL SELECT id, 'coordenacao', 'Coordenação', 'Coordenação geral', 3 FROM schedule_types WHERE key = 'organizacao'
UNION ALL SELECT id, 'limpeza', 'Limpeza', 'Organização e limpeza', 4 FROM schedule_types WHERE key = 'organizacao'
UNION ALL SELECT id, 'encerramento_org', 'Encerramento', 'Fechamento e avaliação', 5 FROM schedule_types WHERE key = 'organizacao'
ON CONFLICT (schedule_type_id, step_type) DO NOTHING;

INSERT INTO schedule_type_steps (schedule_type_id, step_type, label, description, sort_order)
SELECT id, 'planejamento_anual', 'Recebimento de ofertas', 'Quem recebe as ofertas no evento', 1 FROM schedule_types WHERE key = 'financas'
UNION ALL SELECT id, 'revisao_mensal', 'Contagem', 'Quem faz a contagem', 2 FROM schedule_types WHERE key = 'financas'
UNION ALL SELECT id, 'revisao_trimestral', 'Tesoureiro de plantão', 'Tesoureiro escalado no evento', 3 FROM schedule_types WHERE key = 'financas'
UNION ALL SELECT id, 'datas_chave', 'Entrega no cofre', 'Quem entrega no cofre', 4 FROM schedule_types WHERE key = 'financas'
UNION ALL SELECT id, 'prestacao_contas', 'Relatório do dia', 'Quem preenche o relatório do dia', 5 FROM schedule_types WHERE key = 'financas'
ON CONFLICT (schedule_type_id, step_type) DO NOTHING;

INSERT INTO schedule_type_steps (schedule_type_id, step_type, label, description, sort_order)
SELECT id, 'acolhimento_cons', 'Primeiro contato', 'Quem faz o primeiro contato com visitantes', 1 FROM schedule_types WHERE key = 'consolidacao'
UNION ALL SELECT id, 'acompanhamento', 'Cadastro de visitantes', 'Quem cadastra / lista de visitantes', 2 FROM schedule_types WHERE key = 'consolidacao'
UNION ALL SELECT id, 'discipulado', 'Entrega de material', 'Quem entrega material ao visitante', 3 FROM schedule_types WHERE key = 'consolidacao'
UNION ALL SELECT id, 'revisita', 'Agendamento de visita', 'Quem agenda visita ou célula', 4 FROM schedule_types WHERE key = 'consolidacao'
UNION ALL SELECT id, 'integracao', 'Acolhimento de visitantes', 'Quem acolhe os visitantes no evento', 5 FROM schedule_types WHERE key = 'consolidacao'
ON CONFLICT (schedule_type_id, step_type) DO NOTHING;

INSERT INTO schedule_type_steps (schedule_type_id, step_type, label, description, sort_order)
SELECT id, 'reuniao_lideranca', 'Coordenador geral', 'Quem coordena o evento', 1 FROM schedule_types WHERE key = 'lideranca'
UNION ALL SELECT id, 'planejamento_lid', 'Líder de sala/setor', 'Líder responsável por um setor ou sala', 2 FROM schedule_types WHERE key = 'lideranca'
UNION ALL SELECT id, 'treinamento', 'Apoio à liderança', 'Apoio escalado no evento', 3 FROM schedule_types WHERE key = 'lideranca'
UNION ALL SELECT id, 'avaliacao', 'Supervisão', 'Quem supervisiona durante o evento', 4 FROM schedule_types WHERE key = 'lideranca'
UNION ALL SELECT id, 'delegacao', 'Fechamento', 'Quem faz o fechamento do evento', 5 FROM schedule_types WHERE key = 'lideranca'
ON CONFLICT (schedule_type_id, step_type) DO NOTHING;

COMMENT ON TABLE schedule_types IS 'Tipos de escala (cronogramas) gerenciáveis por admin: culto, mídia, oração, etc.';
COMMENT ON TABLE schedule_type_steps IS 'Etapas de cada tipo de escala (abertura, louvor, etc.).';
