/**
 * Disciplinas Espirituais - catálogo e regras de reset
 * Diárias: resetam a cada dia. Semanais: a cada semana. Mensais: a cada mês.
 */

export type DisciplineCategory = 'daily' | 'weekly' | 'monthly';

export interface SpiritualDiscipline {
  key: string;
  title: string;
  category: DisciplineCategory;
  xpAmount: number;
  sortOrder: number;
}

/** Disciplinas padrão (fallback se o banco ainda não tiver seed) */
export const SPIRITUAL_DISCIPLINES: SpiritualDiscipline[] = [
  { key: 'reading', title: 'Leitura da Palavra', category: 'daily', xpAmount: 10, sortOrder: 1 },
  { key: 'prayer_secret', title: 'Secreto com Deus (oração pessoal)', category: 'daily', xpAmount: 5, sortOrder: 2 },
  { key: 'devotional_daily', title: 'Devocional diário', category: 'daily', xpAmount: 5, sortOrder: 3 },
  { key: 'gratitude', title: 'Agradeça a Deus por algo - Gratidão', category: 'daily', xpAmount: 5, sortOrder: 4 },
  { key: 'pray_for_someone', title: 'Orar por alguém', category: 'weekly', xpAmount: 10, sortOrder: 10 },
  { key: 'share_god', title: 'Falar de Deus para alguém', category: 'weekly', xpAmount: 10, sortOrder: 11 },
  { key: 'talk_brother', title: 'Conversar com algum irmão da Igreja', category: 'weekly', xpAmount: 10, sortOrder: 12 },
  { key: 'reflection_week', title: 'Reflexão espiritual da semana', category: 'weekly', xpAmount: 15, sortOrder: 13 },
  { key: 'fast', title: 'Jejum', category: 'monthly', xpAmount: 15, sortOrder: 20 },
  { key: 'bible_study', title: 'Estudo bíblico', category: 'monthly', xpAmount: 15, sortOrder: 21 },
  { key: 'service', title: 'Serviço', category: 'monthly', xpAmount: 15, sortOrder: 22 },
  { key: 'self_assessment', title: 'Autoavaliação espiritual', category: 'monthly', xpAmount: 15, sortOrder: 23 },
];

export function getDisciplinesByCategory(): { daily: SpiritualDiscipline[]; weekly: SpiritualDiscipline[]; monthly: SpiritualDiscipline[] } {
  const daily = SPIRITUAL_DISCIPLINES.filter((d) => d.category === 'daily').sort((a, b) => a.sortOrder - b.sortOrder);
  const weekly = SPIRITUAL_DISCIPLINES.filter((d) => d.category === 'weekly').sort((a, b) => a.sortOrder - b.sortOrder);
  const monthly = SPIRITUAL_DISCIPLINES.filter((d) => d.category === 'monthly').sort((a, b) => a.sortOrder - b.sortOrder);
  return { daily, weekly, monthly };
}

export function getDisciplineByKey(key: string): SpiritualDiscipline | undefined {
  return SPIRITUAL_DISCIPLINES.find((d) => d.key === key);
}
