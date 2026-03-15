/**
 * Serviço da Vida Espiritual
 * Calcula o estado (ovelinha) a partir da constância semanal: dias distintos com prática diária.
 * Regra: 4–7 dias = saudável, 2–3 = frágil, 1 = esporádico, 0 = negligenciado.
 * Não remove XP; linguagem pastoral (convite, nunca acusação).
 */

import { getOrCreateJourneyProfile, getActiveDaysInWeek } from './spiritualJourney';
import type { SpiritualCompanionState } from '../types/spiritualCompanion';
import type { CompanionStateKey } from '../constants/spiritualCompanion';
import {
  COMPANION_ACTIVE_DAYS_THRESHOLDS,
  COMPANION_STATES,
  COMPANION_DAYS_THRESHOLDS,
  getCompanionStateConfig,
} from '../constants/spiritualCompanion';

/** Início da semana (domingo) em YYYY-MM-DD */
function getCurrentWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
}

/**
 * Define o estado da vida espiritual com base nos dias ativos na semana (práticas diárias em dias diferentes).
 * 🟢 4–7 dias → strong (Cuidado saudável)
 * 🟡 2–3 dias → weakening (Cuidado frágil)
 * 🔴 1 dia → weak (Cuidado esporádico)
 * 🔴 0 dias (com histórico) → bones (Cuidado negligenciado)
 * 🟢 0 dias (usuário novo, sem histórico) → strong (começa com a melhor vida espiritual)
 */
function stateFromActiveDaysThisWeek(activeDays: number, isNewUser: boolean): CompanionStateKey {
  if (activeDays === 0 && isNewUser) return 'strong';
  if (activeDays >= COMPANION_ACTIVE_DAYS_THRESHOLDS.STRONG_MIN_DAYS && activeDays <= COMPANION_ACTIVE_DAYS_THRESHOLDS.STRONG_MAX_DAYS)
    return 'strong';
  if (
    activeDays >= COMPANION_ACTIVE_DAYS_THRESHOLDS.WEAKENING_MIN_DAYS &&
    activeDays <= COMPANION_ACTIVE_DAYS_THRESHOLDS.WEAKENING_MAX_DAYS
  )
    return 'weakening';
  if (activeDays === 1) return 'weak';
  return 'bones';
}

/**
 * Obtém o estado atual da Vida Espiritual para o usuário.
 * Baseado em quantos dias distintos na semana atual tiveram prática diária
 * (devocional, oração, reflexão ou disciplinas diárias: Leitura da Palavra, Secreto com Deus, Devocional diário, Gratidão).
 */
export async function getCompanionState(userId: string): Promise<SpiritualCompanionState | null> {
  const profile = await getOrCreateJourneyProfile(userId);
  if (!profile) return null;

  const weekStart = getCurrentWeekStart();
  const activeDaysThisWeek = await getActiveDaysInWeek(userId, weekStart);
  const isNewUser = (profile.total_xp === 0 && !profile.last_activity_date);
  const state = stateFromActiveDaysThisWeek(activeDaysThisWeek, isNewUser);
  const config = getCompanionStateConfig(state);

  return {
    state,
    daysWithoutPractice: 7 - activeDaysThisWeek,
    activeDaysThisWeek,
    lastActivityDate: profile.last_activity_date ?? null,
    message: config.message,
    label: config.label,
  };
}

export { COMPANION_STATES, COMPANION_DAYS_THRESHOLDS, COMPANION_ACTIVE_DAYS_THRESHOLDS };
