/**
 * Tipos da Jornada Espiritual
 */

import type { SpiritualActionType } from '../constants/spiritualJourney';

export interface SpiritualJourneyProfile {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  streak_weeks: number;
  last_activity_date: string | null;
  last_streak_week_start: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpiritualXpEvent {
  id: string;
  user_id: string;
  action_type: SpiritualActionType;
  xp_amount: number;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface SpiritualReflection {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

/** Resumo para UI: etapa atual, textos do nível, progresso, streak */
export interface SpiritualJourneySummary {
  totalXp: number;
  level: number;
  levelName: string;
  levelTitle?: string;
  levelDescription?: string;
  levelShortDescription?: string;
  levelLongDescription?: string;
  levelInspirationalPhrase?: string;
  levelVerse?: string;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
  streakWeeks: number;
  canLevelUp: boolean;
}
