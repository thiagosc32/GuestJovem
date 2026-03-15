/**
 * Tipos da Vida Espiritual (estado visual do passarinho)
 */

import type { CompanionStateKey } from '../constants/spiritualCompanion';

export interface SpiritualCompanionState {
  /** Estado atual da vida espiritual (ovelinha) */
  state: CompanionStateKey;
  /** Dias na semana atual sem prática diária (7 - activeDaysThisWeek); mantido para compatibilidade */
  daysWithoutPractice: number;
  /** Dias distintos nesta semana com prática diária (devocional, oração, reflexão ou disciplinas diárias) */
  activeDaysThisWeek?: number;
  /** Data da última atividade (YYYY-MM-DD) ou null se nunca */
  lastActivityDate: string | null;
  /** Mensagem contextual (pastoral) para exibir */
  message: string;
  /** Rótulo do estado (ex.: "Cuidado saudável") */
  label: string;
}
