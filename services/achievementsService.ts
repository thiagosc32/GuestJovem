/**
 * Serviço de Conquistas
 * Carrega definições do banco, calcula progresso do usuário por progress_key.
 * Envia notificações quando conquistas são desbloqueadas.
 */

import { supabase, createNotification } from './supabase';
import { loadProgress } from './bibleReadingProgress';
import { getCustomPlans } from './bibleCustomPlans';
import { BIBLE_READING_PLANS } from '../constants/bibleReadingPlans';
import { countCompletedReadings } from './bibleReadingProgress';
import { getJourneySummary } from './spiritualJourney';
import { isFeatureAvailableForLevel } from '../constants/featureGates';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress_key: string;
  max_progress: number;
  sort_order: number;
  is_active: boolean;
}

export interface UserAchievementProgress {
  id: string;
  definition: AchievementDefinition;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

/** Lista de ícones disponíveis para o admin escolher */
export const ACHIEVEMENT_ICONS = [
  { id: 'flame', label: 'Chama' },
  { id: 'book', label: 'Livro' },
  { id: 'book-open', label: 'Livro aberto' },
  { id: 'dove', label: 'Pomba' },
  { id: 'calendar', label: 'Calendário' },
  { id: 'pen-line', label: 'Caneta' },
  { id: 'message-circle', label: 'Mensagem' },
  { id: 'list-checks', label: 'Checklist' },
  { id: 'heart', label: 'Coração' },
  { id: 'award', label: 'Troféu' },
  { id: 'star', label: 'Estrela' },
  { id: 'sparkles', label: 'Brilhos' },
  { id: 'target', label: 'Alvo' },
  { id: 'gem', label: 'Gema' },
  { id: 'shield', label: 'Escudo' },
] as const;

/** Chaves de progresso suportadas para cálculo */
export const PROGRESS_KEYS = [
  { id: 'prayer_streak', label: 'Dias consecutivos de oração' },
  { id: 'devotional_streak', label: 'Dias consecutivos de devocional' },
  { id: 'bible_plans_completed', label: 'Planos bíblicos concluídos' },
  { id: 'fast_completed', label: 'Jejum concluído' },
  { id: 'event_checkins', label: 'Presenças em eventos' },
  { id: 'reflections_count', label: 'Reflexões registradas' },
  { id: 'community_posts', label: 'Posts na comunidade' },
  { id: 'disciplines_streak', label: 'Dias consecutivos com disciplinas' },
] as const;

export async function getAchievementDefinitions(): Promise<AchievementDefinition[]> {
  try {
    const { data, error } = await supabase
      .from('achievement_definitions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('achievementsService.getAchievementDefinitions', error?.message ?? error);
      return [];
    }
    return (data ?? []) as AchievementDefinition[];
  } catch (e) {
    console.warn('achievementsService.getAchievementDefinitions', e);
    return [];
  }
}

/** Calcula o progresso para uma chave específica */
export async function computeProgressForKey(userId: string, progressKey: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  switch (progressKey) {
    case 'prayer_streak': {
      const streak = await getConsecutiveDaysForAction(userId, 'prayer_register');
      return streak;
    }
    case 'devotional_streak': {
      const streak = await getConsecutiveDaysForAction(userId, 'devotional');
      return streak;
    }
    case 'bible_plans_completed': {
      return await countCompletedBiblePlans();
    }
    case 'fast_completed': {
      const { data } = await supabase
        .from('spiritual_discipline_completions')
        .select('id')
        .eq('user_id', userId)
        .eq('discipline_key', 'fast')
        .limit(1);
      return (data?.length ?? 0) >= 1 ? 1 : 0;
    }
    case 'event_checkins': {
      const { count, error } = await supabase
        .from('spiritual_xp_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action_type', 'event_checkin');
      if (error) return 0;
      return count ?? 0;
    }
    case 'reflections_count': {
      const { count, error } = await supabase
        .from('spiritual_xp_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('action_type', 'reflection');
      if (error) return 0;
      return count ?? 0;
    }
    case 'community_posts': {
      const { count, error } = await supabase
        .from('community_posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error) return 0;
      return count ?? 0;
    }
    case 'disciplines_streak': {
      return await getConsecutiveDaysWithDiscipline(userId);
    }
    default:
      return 0;
  }
}

/** Retorna conjunto de datas (YYYY-MM-DD) com atividade, em uma única query. */
function getUniqueDatesFromCreatedAt(rows: { created_at?: string }[]): Set<string> {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.created_at) set.add(r.created_at.split('T')[0]);
  }
  return set;
}

/** Dias consecutivos (incluindo hoje) com uma ação específica — uma query em vez de até 365. */
async function getConsecutiveDaysForAction(userId: string, actionType: string): Promise<number> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 365);
  const fromStr = fromDate.toISOString().split('T')[0];
  const { data } = await supabase
    .from('spiritual_xp_events')
    .select('created_at')
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .gte('created_at', `${fromStr}T00:00:00.000Z`)
    .order('created_at', { ascending: false })
    .limit(400);
  const datesSet = getUniqueDatesFromCreatedAt(data ?? []);
  let count = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = d.toISOString().split('T')[0];
    if (!datesSet.has(dateStr)) break;
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

/** Dias consecutivos com pelo menos uma disciplina concluída — uma query em vez de até 365. */
async function getConsecutiveDaysWithDiscipline(userId: string): Promise<number> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 365);
  const fromStr = fromDate.toISOString().split('T')[0];
  const { data } = await supabase
    .from('spiritual_discipline_completions')
    .select('completed_at')
    .eq('user_id', userId)
    .gte('completed_at', `${fromStr}T00:00:00.000Z`)
    .order('completed_at', { ascending: false })
    .limit(400);
  const set = new Set<string>();
  for (const r of data ?? []) {
    const at = (r as { completed_at?: string }).completed_at;
    if (at) set.add(at.split('T')[0]);
  }
  let count = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const dateStr = d.toISOString().split('T')[0];
    if (!set.has(dateStr)) break;
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

/** Conta planos bíblicos 100% concluídos (AsyncStorage é local) */
async function countCompletedBiblePlans(): Promise<number> {
  let completed = 0;
  const progress = await loadProgress();

  for (const plan of BIBLE_READING_PLANS) {
    const totalDays = plan.totalDays;
    const count = countCompletedReadings(progress, plan.id, totalDays, (d) => plan.getReadingForDay(d).length);
    const totalReadings = Array.from({ length: totalDays }, (_, i) => plan.getReadingForDay(i + 1).length).reduce((a, b) => a + b, 0);
    if (totalReadings > 0 && count >= totalReadings) completed++;
  }

  const customPlans = await getCustomPlans();
  for (const plan of customPlans) {
    const totalDays = plan.totalDays ?? plan.readings?.length ?? 0;
    if (totalDays === 0) continue;
    const count = countCompletedReadings(progress, plan.id, totalDays, (d) => plan.getReadingForDay(d).length);
    const totalReadings = Array.from({ length: totalDays }, (_, i) => plan.getReadingForDay(i + 1).length).reduce((a, b) => a + b, 0);
    if (totalReadings > 0 && count >= totalReadings) completed++;
  }

  return completed;
}

/** Nível mínimo para liberar conquistas (badges). Abaixo disso o progresso não é contabilizado. */
const BADGES_MIN_LEVEL = 3;

/** Retorna progresso do usuário para todas as definições. Usa fallback local se DB vazio.
 * Só contabiliza progresso e desbloqueios para usuários que já liberaram conquistas (nível >= BADGES_MIN_LEVEL).
 */
export async function getUserAchievementProgress(userId: string): Promise<UserAchievementProgress[]> {
  const definitions = await getAchievementDefinitions();
  const summary = await getJourneySummary(userId);
  const level = summary?.level ?? 1;
  const badgesUnlocked = isFeatureAvailableForLevel('badges', level);

  const zeroProgress = (def: { id: string; title: string; description: string; icon: string; progress_key: string; max_progress: number; sort_order?: number; is_active?: boolean }) => ({
    id: def.id,
    definition: { ...def, sort_order: def.sort_order ?? 0, is_active: def.is_active ?? true },
    progress: 0,
    unlocked: false,
    unlockedAt: undefined,
  });

  if (!badgesUnlocked) {
    if (definitions.length === 0) {
      const { BADGE_CONFIGS } = await import('../constants/badges');
      return BADGE_CONFIGS.map((c) => zeroProgress({
        id: c.id, title: c.title, description: c.description, icon: c.icon,
        progress_key: c.progressKey, max_progress: c.maxProgress, sort_order: 0, is_active: true,
      }));
    }
    return definitions.map((def) => zeroProgress(def));
  }

  if (definitions.length === 0) {
    const { BADGE_CONFIGS } = await import('../constants/badges');
    const progressValues = await Promise.all(
      BADGE_CONFIGS.map((c) => computeProgressForKey(userId, c.progressKey))
    );
    return BADGE_CONFIGS.map((c, i) => {
      const progress = progressValues[i];
      const unlocked = progress >= c.maxProgress;
      return {
        id: c.id,
        definition: {
          id: c.id,
          title: c.title,
          description: c.description,
          icon: c.icon,
          progress_key: c.progressKey,
          max_progress: c.maxProgress,
          sort_order: 0,
          is_active: true,
        },
        progress: Math.min(progress, c.maxProgress),
        unlocked,
        unlockedAt: unlocked ? new Date().toISOString() : undefined,
      };
    });
  }

  const progressValues = await Promise.all(
    definitions.map((def) => computeProgressForKey(userId, def.progress_key))
  );
  return definitions.map((def, i) => {
    const progress = progressValues[i];
    const unlocked = progress >= def.max_progress;
    return {
      id: def.id,
      definition: def,
      progress: Math.min(progress, def.max_progress),
      unlocked,
      unlockedAt: unlocked ? new Date().toISOString() : undefined,
    };
  });
}

/** Apenas conquistas desbloqueadas (para exibir no perfil) */
export async function getUnlockedAchievements(userId: string): Promise<UserAchievementProgress[]> {
  const all = await getUserAchievementProgress(userId);
  return all.filter((a) => a.unlocked);
}

/** Cria notificação quando uma conquista é desbloqueada (evita duplicatas).
 * Só notifica usuários que já liberaram conquistas (nível >= BADGES_MIN_LEVEL).
 */
export async function notifyAchievementUnlockIfNew(
  userId: string,
  progressKey: string,
  options?: { title: string; description: string }
): Promise<void> {
  try {
    const summary = await getJourneySummary(userId);
    const level = summary?.level ?? 1;
    if (!isFeatureAvailableForLevel('badges', level)) return;

    const definitions = await getAchievementDefinitions();
    const def = definitions.find((d) => d.progress_key === progressKey);
    const title = options?.title ?? def?.title ?? 'Conquista desbloqueada!';
    const description = options?.description ?? def?.description ?? '';

    const progress = await computeProgressForKey(userId, progressKey);
    const maxProgress = def?.max_progress ?? 1;
    if (progress < maxProgress) return;

    const actionUrl = `achievement_unlock:${progressKey}`;
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'achievement')
      .eq('action_url', actionUrl)
      .limit(1);

    if (existing?.length) return;

    await createNotification({
      user_id: userId,
      type: 'achievement',
      title: `🏆 ${title}`,
      message: description || 'Você desbloqueou uma nova conquista!',
      action_url: actionUrl,
    });
  } catch (e) {
    console.warn('achievementsService.notifyAchievementUnlockIfNew', e);
  }
}

/** CRUD para admin */
export async function createAchievementDefinition(data: {
  title: string;
  description: string;
  icon: string;
  progress_key: string;
  max_progress: number;
  sort_order?: number;
}) {
  const { data: row, error } = await supabase
    .from('achievement_definitions')
    .insert({
      title: data.title,
      description: data.description,
      icon: data.icon,
      progress_key: data.progress_key,
      max_progress: data.max_progress,
      sort_order: data.sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function updateAchievementDefinition(
  id: string,
  data: Partial<{ title: string; description: string; icon: string; progress_key: string; max_progress: number; sort_order: number; is_active: boolean }>
) {
  const { data: row, error } = await supabase
    .from('achievement_definitions')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return row;
}

export async function deleteAchievementDefinition(id: string) {
  const { error } = await supabase.from('achievement_definitions').delete().eq('id', id);
  if (error) throw error;
}
