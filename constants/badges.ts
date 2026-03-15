/**
 * Badges (Conquistas) — gamificação cristã leve.
 * Os níveis não medem valor espiritual; os badges celebram passos na jornada.
 */

export interface BadgeConfig {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji ou nome de ícone
  /** Chave para verificar progresso (ex: prayer_streak_7, first_plan, fast_completed) */
  progressKey: string;
  maxProgress: number;
}

/** Fallback quando o banco ainda não tem definições */
export const BADGE_CONFIGS: BadgeConfig[] = [
  { id: 'prayer_streak_7', title: '7 dias de oração', description: 'Orou consecutivos por 7 dias', icon: 'flame', progressKey: 'prayer_streak', maxProgress: 7 },
  { id: 'first_bible_plan', title: 'Primeiro plano bíblico', description: 'Concluiu seu primeiro plano de leitura', icon: 'book', progressKey: 'bible_plans_completed', maxProgress: 1 },
  { id: 'fast_completed', title: 'Jejum concluído', description: 'Completou um jejum nas disciplinas espirituais', icon: 'dove', progressKey: 'fast_completed', maxProgress: 1 },
  { id: 'devotional_streak_7', title: '7 dias de devocional', description: 'Leu devocional 7 dias consecutivos', icon: 'book-open', progressKey: 'devotional_streak', maxProgress: 7 },
  { id: 'event_checkins_5', title: '5 eventos participados', description: 'Confirmou presença em 5 eventos', icon: 'calendar', progressKey: 'event_checkins', maxProgress: 5 },
  { id: 'reflections_10', title: '10 reflexões', description: 'Registrou 10 reflexões espirituais', icon: 'pen-line', progressKey: 'reflections_count', maxProgress: 10 },
  { id: 'first_post', title: 'Primeiro post', description: 'Publicou seu primeiro post na comunidade', icon: 'message-circle', progressKey: 'community_posts', maxProgress: 1 },
  { id: 'disciplines_streak_7', title: '7 dias de disciplinas', description: 'Marcou pelo menos uma disciplina por 7 dias', icon: 'list-checks', progressKey: 'disciplines_streak', maxProgress: 7 },
];
