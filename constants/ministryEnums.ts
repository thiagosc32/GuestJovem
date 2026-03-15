/**
 * Enums e labels para o Gerenciador de Ministérios.
 */

export const TASK_TYPES = ['pontual', 'recorrente'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  pontual: 'Pontual',
  recorrente: 'Recorrente',
};

export const TASK_FREQUENCIES = ['diaria', 'semanal', 'mensal'] as const;
export type TaskFrequency = (typeof TASK_FREQUENCIES)[number];

export const TASK_FREQUENCY_LABELS: Record<TaskFrequency, string> = {
  diaria: 'Diária',
  semanal: 'Semanal',
  mensal: 'Mensal',
};

export const TASK_PRIORITIES = ['baixa', 'media', 'alta'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export const TASK_STATUSES = ['pendente', 'em_andamento', 'concluida'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

export const INVOLVEMENT_LEVELS = ['apoio', 'ativo', 'equipe', 'lideranca'] as const;
export type InvolvementLevel = (typeof INVOLVEMENT_LEVELS)[number];

export const INVOLVEMENT_LEVEL_LABELS: Record<InvolvementLevel, string> = {
  apoio: 'Apoio',
  ativo: 'Ativo',
  equipe: 'Equipe',
  lideranca: 'Liderança',
};
