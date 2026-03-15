/**
 * Tipos de escala e etapas: Culto, Mídia, Oração, Organização, Finanças, Consolidação, Liderança.
 */

export const SCHEDULE_TYPES = [
  { id: 'culto', label: 'Escala culto' },
  { id: 'midia', label: 'Escala mídia' },
  { id: 'oracao', label: 'Escala oração' },
  { id: 'organizacao', label: 'Escala organização' },
  { id: 'financas', label: 'Escala finanças' },
  { id: 'consolidacao', label: 'Escala consolidação' },
  { id: 'lideranca', label: 'Escala liderança' },
] as const;

export type ScheduleTypeId = (typeof SCHEDULE_TYPES)[number]['id'];

/** Etapas da escala culto */
export const CULTO_STEPS = [
  { step_type: 'abertura', label: 'Abertura' },
  { step_type: 'louvor', label: 'Louvor' },
  { step_type: 'transicao', label: 'Transição' },
  { step_type: 'boas_vindas', label: 'Boas vindas' },
  { step_type: 'ofertas', label: 'Ofertas' },
  { step_type: 'palavra', label: 'Palavra' },
  { step_type: 'encerramento', label: 'Encerramento' },
] as const;

/** Etapas da escala mídia */
export const MIDIA_STEPS = [
  { step_type: 'pre_culto', label: 'Pré-culto', description: 'Stories de expectativa, ambiente sendo preparado' },
  { step_type: 'inicio_ambiente', label: 'Início / Ambiente', description: 'Story curto do culto começando + foto geral' },
  { step_type: 'louvor_registros', label: 'Louvor (registros leves)', description: 'Sem close, sem excesso' },
  { step_type: 'palavra_anotacoes', label: 'Palavra (anotações)', description: 'Anotar frases → não postar' },
  { step_type: 'encerramento_gratidao', label: 'Encerramento / Gratidão', description: 'Story final + foto do ambiente' },
] as const;

/** Etapas da escala oração */
export const ORACAO_STEPS = [
  { step_type: 'intercessao', label: 'Intercessão', description: 'Momento de oração intercessória' },
  { step_type: 'encontros', label: 'Encontros', description: 'Encontros de oração / células' },
  { step_type: 'vigilia', label: 'Vigília', description: 'Vigílias e noites de oração' },
  { step_type: 'celula_oracao', label: 'Célula de oração', description: 'Reuniões em pequenos grupos' },
] as const;

/** Etapas da escala organização */
export const ORGANIZACAO_STEPS = [
  { step_type: 'preparacao_org', label: 'Preparação', description: 'Preparação do ambiente e estrutura' },
  { step_type: 'recepcao', label: 'Recepção', description: 'Recepção e acolhimento' },
  { step_type: 'coordenacao', label: 'Coordenação', description: 'Coordenação geral' },
  { step_type: 'limpeza', label: 'Limpeza', description: 'Organização e limpeza' },
  { step_type: 'encerramento_org', label: 'Encerramento', description: 'Fechamento e avaliação' },
] as const;

/** Etapas da escala finanças (quem está escalado no evento) */
export const FINANCAS_STEPS = [
  { step_type: 'planejamento_anual', label: 'Recebimento de ofertas', description: 'Quem recebe as ofertas no evento' },
  { step_type: 'revisao_mensal', label: 'Contagem', description: 'Quem faz a contagem' },
  { step_type: 'revisao_trimestral', label: 'Tesoureiro de plantão', description: 'Tesoureiro escalado no evento' },
  { step_type: 'datas_chave', label: 'Entrega no cofre', description: 'Quem entrega no cofre' },
  { step_type: 'prestacao_contas', label: 'Relatório do dia', description: 'Quem preenche o relatório do dia' },
] as const;

/** Etapas da escala consolidação (quem está escalado no evento) */
export const CONSOLIDACAO_STEPS = [
  { step_type: 'acolhimento_cons', label: 'Primeiro contato', description: 'Quem faz o primeiro contato com visitantes' },
  { step_type: 'acompanhamento', label: 'Cadastro de visitantes', description: 'Quem cadastra / lista de visitantes' },
  { step_type: 'discipulado', label: 'Entrega de material', description: 'Quem entrega material ao visitante' },
  { step_type: 'revisita', label: 'Agendamento de visita', description: 'Quem agenda visita ou célula' },
  { step_type: 'integracao', label: 'Acolhimento de visitantes', description: 'Quem acolhe os visitantes no evento' },
] as const;

/** Etapas da escala liderança (quem está escalado no evento) */
export const LIDERANCA_STEPS = [
  { step_type: 'reuniao_lideranca', label: 'Coordenador geral', description: 'Quem coordena o evento' },
  { step_type: 'planejamento_lid', label: 'Líder de sala/setor', description: 'Líder responsável por um setor ou sala' },
  { step_type: 'treinamento', label: 'Apoio à liderança', description: 'Apoio escalado no evento' },
  { step_type: 'avaliacao', label: 'Supervisão', description: 'Quem supervisiona durante o evento' },
  { step_type: 'delegacao', label: 'Fechamento', description: 'Quem faz o fechamento do evento' },
] as const;

export type CultoStepType = (typeof CULTO_STEPS)[number]['step_type'];
export type MidiaStepType = (typeof MIDIA_STEPS)[number]['step_type'];

const ALL_STEP_SETS: Record<ScheduleTypeId, readonly { step_type: string; label: string; description?: string }[]> = {
  culto: CULTO_STEPS,
  midia: MIDIA_STEPS,
  oracao: ORACAO_STEPS,
  organizacao: ORGANIZACAO_STEPS,
  financas: FINANCAS_STEPS,
  consolidacao: CONSOLIDACAO_STEPS,
  lideranca: LIDERANCA_STEPS,
};

/** Lista de step_type por tipo de escala */
export const SCHEDULE_STEP_TYPES_CULTO = CULTO_STEPS.map((s) => s.step_type);
export const SCHEDULE_STEP_TYPES_MIDIA = MIDIA_STEPS.map((s) => s.step_type);

/** Retorna as etapas do tipo de escala */
export function getStepsForScheduleType(type: ScheduleTypeId): readonly { step_type: string; label: string; description?: string }[] {
  return ALL_STEP_SETS[type] ?? CULTO_STEPS;
}

/** Retorna os step_type (ids) para o tipo */
export function getStepTypesForScheduleType(type: ScheduleTypeId): string[] {
  const steps = getStepsForScheduleType(type);
  return steps.map((s) => s.step_type);
}

/** Detecta o tipo de escala a partir dos step_type existentes (para carregar modal) */
export function inferScheduleTypeFromStepTypes(stepTypes: string[]): ScheduleTypeId | null {
  if (stepTypes.length === 0) return null;
  const sets: ScheduleTypeId[] = ['financas', 'organizacao', 'oracao', 'midia', 'culto', 'consolidacao', 'lideranca'];
  for (const id of sets) {
    const types = getStepTypesForScheduleType(id);
    if (stepTypes.some((s) => types.includes(s))) return id;
  }
  return null;
}

/** Label para exibição (card e modal) */
export function getStepLabel(scheduleType: ScheduleTypeId | null | undefined, stepType: string): string {
  if (!scheduleType) {
    const steps = [...CULTO_STEPS, ...MIDIA_STEPS, ...ORACAO_STEPS, ...ORGANIZACAO_STEPS, ...FINANCAS_STEPS, ...CONSOLIDACAO_STEPS, ...LIDERANCA_STEPS];
    const found = steps.find((s) => s.step_type === stepType);
    return found?.label ?? stepType;
  }
  const steps = getStepsForScheduleType(scheduleType);
  const step = steps.find((s) => s.step_type === stepType);
  return step?.label ?? stepType;
}

/** Compatibilidade: labels antigos (só culto) */
export const SCHEDULE_STEP_LABELS: Record<string, string> = Object.fromEntries(CULTO_STEPS.map((s) => [s.step_type, s.label]));
