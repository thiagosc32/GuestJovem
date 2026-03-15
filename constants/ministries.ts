/**
 * Ministérios do ministério de jovens — lista fixa para gerenciamento no admin.
 */

export const MINISTRY_KEYS = [
  'guest_fire',
  'organizacao',
  'criativo',
  'lideranca',
  'midia',
] as const;

export type MinistryKey = (typeof MINISTRY_KEYS)[number];

export const MINISTRY_LABELS: Record<MinistryKey, string> = {
  guest_fire: 'Guest Fire (Oração)',
  organizacao: 'Organização',
  criativo: 'Criativo',
  lideranca: 'Liderança',
  midia: 'Mídia',
};

/** Propósito fixo e institucional por ministério (não editável por membros). */
export const MINISTRY_PURPOSES: Record<MinistryKey, string> = {
  guest_fire:
    'Este ministério existe para sustentar espiritualmente o movimento Guest Fire por meio da oração, intercessão e sensibilidade à voz de Deus. Aqui não buscamos quantidade de tarefas, mas constância diante do Senhor.',
  organizacao:
    'Este ministério existe para garantir ordem, fluidez e excelência prática, criando um ambiente onde tudo pode acontecer sem distrações, ruídos ou improvisos desnecessários.',
  criativo:
    'Este ministério existe para comunicar verdades eternas de forma criativa, bela e relevante, conectando a mensagem do evangelho com a linguagem da geração atual.',
  lideranca:
    'Este ministério existe para cuidar de pessoas, desenvolver líderes saudáveis e garantir que ninguém caminhe sozinho em sua jornada de crescimento.',
  midia:
    'Este ministério existe para amplificar o que Deus está fazendo, comunicando com clareza, estratégia e sensibilidade, alcançando quem ainda não chegou fisicamente.',
};

/** Frases pastorais fixas no sistema. */
export const MINISTRY_PHRASES = {
  topBanner: 'Organização gera paz. Paz gera crescimento.',
  tasksIntro: 'Tarefas não medem espiritualidade ou valor pessoal. Elas existem apenas para organizar responsabilidades e servir melhor às pessoas.',
  tasksSection: 'Fidelidade no simples sustenta o grande.',
  monthlyFocusIntro: 'A agenda mensal não é uma cobrança, mas um direcionamento. Ela ajuda o ministério a caminhar junto.',
  membersIntro: 'As funções organizam o serviço, não definem valor espiritual.',
  membersSection: 'Cuidamos de pessoas antes de cuidar de funções.',
} as const;

export function getMinistryLabel(key: string): string {
  return MINISTRY_LABELS[key as MinistryKey] ?? key;
}

export function getMinistryPurpose(key: string): string {
  return MINISTRY_PURPOSES[key as MinistryKey] ?? '';
}
