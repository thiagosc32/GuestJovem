/**
 * Serviço da Jornada Espiritual
 *
 * Progressão por práticas espirituais (leitura, oração, reflexão, eventos, disciplinas).
 * Diretrizes garantidas na lógica:
 * - Progressão gradual: limite diário e 1x/dia em várias ações.
 * - Sem punição por inatividade: total_xp nunca diminui; só aumenta ou permanece.
 * - Sem regressão de nível: nível é sempre derivado do total_xp (que só sobe), nunca rebaixado.
 * - Constância, não performance: streak apenas celebra semanas com prática; não há penalidade ao parar.
 */

import { supabase } from './supabase';
import { notifyAchievementUnlockIfNew } from './achievementsService';
import type { Database } from '../types/supabase';
import {
  XP_BY_ACTION,
  DAILY_XP_CAP,
  ONCE_PER_DAY_ACTIONS,
  SPIRITUAL_LEVELS,
  STREAK_DAYS_REQUIRED,
  DAYS_IN_WEEK,
  MIN_ACTIVE_DAYS_FOR_VALID_WEEK,
  DAILY_PRACTICE_DISCIPLINE_KEYS,
  mapLegacyLevelToCurrent,
} from '../constants/spiritualJourney';
import type { SpiritualActionType } from '../constants/spiritualJourney';
import { getDisciplineByKey } from '../constants/spiritualDisciplines';
import type { SpiritualJourneyProfile, SpiritualJourneySummary } from '../types/spiritualJourney';

/** Retorna o perfil da jornada do usuário; cria um se não existir */
export async function getOrCreateJourneyProfile(userId: string): Promise<SpiritualJourneyProfile | null> {
  const { data: existing } = await supabase
    .from('spiritual_journey_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return existing as SpiritualJourneyProfile;

  const { data: created, error } = await supabase
    .from('spiritual_journey_profiles')
    .insert({ user_id: userId })
    .select()
    .single();

  if (error) {
    console.error('spiritualJourney.getOrCreateJourneyProfile', error);
    return null;
  }
  return created as SpiritualJourneyProfile;
}

/** Data no formato YYYY-MM-DD (timezone local) */
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** XP já ganho hoje pelo usuário (somando spiritual_xp_events de hoje) */
export async function getXpEarnedToday(userId: string): Promise<number> {
  const today = todayISO();
  const { data, error } = await supabase
    .from('spiritual_xp_events')
    .select('xp_amount')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at', `${today}T23:59:59.999Z`);

  if (error) return 0;
  return (data ?? []).reduce((sum, row) => sum + (row.xp_amount ?? 0), 0);
}

/**
 * Conta quantos dias distintos na semana tiveram "prática diária" (devocional, oração, reflexão ou disciplinas diárias).
 * Usado para: (1) estado da ovelha (constância semanal) e (2) validar semana para streak.
 * weekStartDate = YYYY-MM-DD (início da semana, ex.: domingo).
 */
export async function getActiveDaysInWeek(userId: string, weekStartDate: string): Promise<number> {
  const start = `${weekStartDate}T00:00:00.000Z`;
  const endDate = new Date(weekStartDate + 'T12:00:00.000Z');
  endDate.setDate(endDate.getDate() + 7);
  const end = endDate.toISOString().slice(0, 10) + 'T00:00:00.000Z';

  const { data, error } = await supabase
    .from('spiritual_xp_events')
    .select('action_type, reference_id, created_at')
    .eq('user_id', userId)
    .gte('created_at', start)
    .lt('created_at', end)
    .in('action_type', ['devotional', 'prayer_register', 'reflection', 'discipline']);

  if (error) return 0;

  const dailyKeysSet = new Set(DAILY_PRACTICE_DISCIPLINE_KEYS);
  const dates = new Set<string>();
  for (const row of data ?? []) {
    const action = (row as { action_type?: string; reference_id?: string; created_at?: string }).action_type;
    const refId = (row as { reference_id?: string }).reference_id;
    const createdAt = (row as { created_at?: string }).created_at;
    const isDaily =
      action === 'devotional' || action === 'prayer_register' || action === 'reflection' ||
      (action === 'discipline' && refId != null && dailyKeysSet.has(refId));
    if (isDaily && createdAt) dates.add(createdAt.slice(0, 10));
  }
  return dates.size;
}

/** Verifica se a ação já foi contabilizada hoje (para ações 1x/dia) */
async function hasActionToday(userId: string, actionType: SpiritualActionType): Promise<boolean> {
  const today = todayISO();
  const { count, error } = await supabase
    .from('spiritual_xp_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at', `${today}T23:59:59.999Z`);

  if (error) return true; // em caso de erro, não conceder de novo
  return (count ?? 0) > 0;
}

/** Para event_checkin: verifica se já ganhou XP por este evento */
async function hasEventCheckinToday(userId: string, eventId: string): Promise<boolean> {
  const today = todayISO();
  const { count, error } = await supabase
    .from('spiritual_xp_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', 'event_checkin')
    .eq('reference_id', eventId)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lt('created_at', `${today}T23:59:59.999Z`);

  if (error) return true;
  return (count ?? 0) > 0;
}

/**
 * Verifica se pode conceder XP para esta ação.
 * Respeita: limite diário, 1x por dia onde aplicável, 1 check-in por evento.
 * Para actionType 'discipline', use canAwardDisciplineXp.
 */
export async function canAwardXp(
  userId: string,
  actionType: SpiritualActionType,
  options?: { referenceId?: string; xpOverride?: number }
): Promise<{ allowed: boolean; reason?: string }> {
  const xpForAction = actionType === 'discipline' && options?.xpOverride != null ? options.xpOverride : XP_BY_ACTION[actionType];
  const xpToday = await getXpEarnedToday(userId);

  if (xpToday >= DAILY_XP_CAP) {
    return { allowed: false, reason: 'Limite diário de passos atingido.' };
  }
  if (xpToday + xpForAction > DAILY_XP_CAP) {
    return { allowed: false, reason: 'Esta ação excederia o limite diário de passos.' };
  }

  if (actionType === 'discipline' && options?.referenceId) {
    const disc = getDisciplineByKey(options.referenceId);
    return canAwardDisciplineXp(userId, options.referenceId, xpForAction, disc?.category ?? 'daily');
  }

  if (ONCE_PER_DAY_ACTIONS.includes(actionType)) {
    const already = await hasActionToday(userId, actionType);
    if (already) return { allowed: false, reason: 'Esta ação já foi contada hoje.' };
  }

  if (actionType === 'event_checkin' && options?.referenceId) {
    const already = await hasEventCheckinToday(userId, options.referenceId);
    if (already) return { allowed: false, reason: 'Você já registrou presença neste evento hoje.' };
  }

  return { allowed: true };
}

/** Verifica se a disciplina já foi concluída no período (hoje / esta semana / este mês) */
async function hasDisciplineInPeriod(userId: string, disciplineKey: string, period: 'day' | 'week' | 'month'): Promise<boolean> {
  const now = new Date();
  let start: string;
  if (period === 'day') {
    start = now.toISOString().split('T')[0] + 'T00:00:00.000Z';
  } else if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    start = d.toISOString();
  } else {
    start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00.000Z`;
  }
  const { count, error } = await supabase
    .from('spiritual_xp_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', 'discipline')
    .eq('reference_id', disciplineKey)
    .gte('created_at', start);
  if (error) return true;
  return (count ?? 0) > 0;
}

/** Verifica se pode conceder XP para uma disciplina (respeita período diário/semanal/mensal) */
export async function canAwardDisciplineXp(
  userId: string,
  disciplineKey: string,
  xpAmount: number,
  category: 'daily' | 'weekly' | 'monthly'
): Promise<{ allowed: boolean; reason?: string }> {
  const period = category === 'daily' ? 'day' : category === 'weekly' ? 'week' : 'month';
  const already = await hasDisciplineInPeriod(userId, disciplineKey, period);
  if (already) {
    const msg = category === 'daily' ? 'Esta disciplina já foi marcada hoje.' : category === 'weekly' ? 'Esta disciplina já foi marcada esta semana.' : 'Esta disciplina já foi marcada este mês.';
    return { allowed: false, reason: msg };
  }
  const xpToday = await getXpEarnedToday(userId);
  if (xpToday >= DAILY_XP_CAP) return { allowed: false, reason: 'Limite diário de passos atingido.' };
  if (xpToday + xpAmount > DAILY_XP_CAP) return { allowed: false, reason: 'Excederia o limite diário de passos.' };
  return { allowed: true };
}

/**
 * Concede XP ao usuário pela ação. Respeita limites e 1x/dia.
 * Atualiza total_xp e current_level no perfil e recalcula streak.
 * @returns XP concedido (0 se não permitido)
 */
export async function awardXp(
  userId: string,
  actionType: SpiritualActionType,
  options?: { referenceId?: string; referenceType?: string; xpOverride?: number }
): Promise<{ xpAwarded: number; newTotalXp: number }> {
  const xpAmount = actionType === 'discipline' && options?.xpOverride != null ? options.xpOverride : XP_BY_ACTION[actionType];
  const { allowed } = await canAwardXp(userId, actionType, { referenceId: options?.referenceId, xpOverride: options?.xpOverride });
  if (!allowed) return { xpAwarded: 0, newTotalXp: 0 };

  const profile = await getOrCreateJourneyProfile(userId);
  if (!profile) return { xpAwarded: 0, newTotalXp: 0 };

  const { error: insertError } = await supabase.from('spiritual_xp_events').insert({
    user_id: userId,
    action_type: actionType,
    xp_amount: xpAmount,
    reference_id: options?.referenceId ?? null,
    reference_type: options?.referenceType ?? null,
  });

  if (insertError) {
    console.error('spiritualJourney.awardXp insert event', insertError);
    return { xpAwarded: 0, newTotalXp: profile.total_xp };
  }

  const newTotalXp = profile.total_xp + xpAmount;
  const newLevel = getLevelFromTotalXp(newTotalXp);
  // Garantia: nunca diminuir nível nem total (progressão só avança ou mantém)
  const safeTotalXp = Math.max(profile.total_xp, newTotalXp);
  const safeLevel = Math.max(profile.current_level, newLevel);

  const updatePayload: Database['public']['Tables']['spiritual_journey_profiles']['Update'] = {
    total_xp: safeTotalXp,
    current_level: safeLevel,
    last_activity_date: todayISO(),
  };

  const updatedProfile = await updateStreakInProfile(userId, profile, updatePayload);
  const { error: updateError } = await supabase
    .from('spiritual_journey_profiles')
    .update(updatedProfile)
    .eq('user_id', userId);

  if (updateError) console.error('spiritualJourney.awardXp update profile', updateError);

  return { xpAwarded: xpAmount, newTotalXp };
}

/**
 * Calcula a etapa (1-5) a partir do total de passos.
 * Regra: nível nunca regride. Como total_xp só aumenta (nunca é diminuído), o nível só sobe ou permanece.
 */
export function getLevelFromTotalXp(totalXp: number): number {
  let level = 1;
  for (let i = SPIRITUAL_LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= SPIRITUAL_LEVELS[i].minXp) {
      level = SPIRITUAL_LEVELS[i].level;
      break;
    }
  }
  return level;
}

/** Etapa atual e faixa de passos (XP) do nível — mesma regra de getLevelFromTotalXp (maior nível onde totalXp >= minXp). */
export function getLevelInfo(totalXp: number): {
  level: number;
  name: string;
  title: string;
  description: string;
  shortDescription: string;
  longDescription: string;
  inspirationalPhrase: string;
  verse?: string;
  minXp: number;
  nextMinXp: number | null;
  xpInLevel: number;
  xpNeededInLevel: number;
  progressPercent: number;
} {
  const levelNumber = getLevelFromTotalXp(totalXp);
  const current = SPIRITUAL_LEVELS.find((l) => l.level === levelNumber) ?? SPIRITUAL_LEVELS[0];
  const next = SPIRITUAL_LEVELS.find((l) => l.minXp > totalXp);
  const nextMinXp = next?.minXp ?? null;
  const xpInLevel = totalXp - current.minXp;
  const xpNeededInLevel = nextMinXp !== null ? nextMinXp - current.minXp : 0;
  const progressPercent =
    xpNeededInLevel > 0 ? Math.min(100, (xpInLevel / xpNeededInLevel) * 100) : 100;

  return {
    level: current.level,
    name: current.name,
    title: current.title,
    description: current.shortDescription,
    shortDescription: current.shortDescription,
    longDescription: current.longDescription,
    inspirationalPhrase: current.inspirationalPhrase,
    verse: current.verse,
    minXp: current.minXp,
    nextMinXp,
    xpInLevel,
    xpNeededInLevel,
    progressPercent,
  };
}

/**
 * Atualiza last_activity_date e streak (semanas consecutivas com cuidado mínimo).
 * Regra: semana só conta se houver ≥ MIN_ACTIVE_DAYS_FOR_VALID_WEEK dias distintos com prática diária.
 * Streak quebra após 2 semanas consecutivas sem atingir o mínimo.
 */
async function updateStreakInProfile(
  userId: string,
  profile: SpiritualJourneyProfile,
  updatePayload: Database['public']['Tables']['spiritual_journey_profiles']['Update']
): Promise<Database['public']['Tables']['spiritual_journey_profiles']['Update']> {
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay());
  const currentWeekStr = currentWeekStart.toISOString().split('T')[0];

  const lastCreditedStr = profile.last_streak_week_start ?? null;
  if (!lastCreditedStr) {
    return { ...updatePayload, streak_weeks: 1, last_streak_week_start: currentWeekStr };
  }

  if (lastCreditedStr === currentWeekStr) {
    return { ...updatePayload, last_streak_week_start: currentWeekStr };
  }

  const lastWeekStart = new Date(currentWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekStr = lastWeekStart.toISOString().split('T')[0];

  if (lastCreditedStr === lastWeekStr) {
    return { ...updatePayload, last_streak_week_start: currentWeekStr };
  }

  const twoWeeksAgoStart = new Date(lastWeekStart);
  twoWeeksAgoStart.setDate(twoWeeksAgoStart.getDate() - 7);
  const twoWeeksAgoStr = twoWeeksAgoStart.toISOString().split('T')[0];

  const [activeDaysLastWeek, activeDaysTwoWeeksAgo] = await Promise.all([
    getActiveDaysInWeek(userId, lastWeekStr),
    getActiveDaysInWeek(userId, twoWeeksAgoStr),
  ]);

  let streakWeeks = profile.streak_weeks;
  let newLastStreakWeek = lastCreditedStr;

  if (activeDaysLastWeek >= MIN_ACTIVE_DAYS_FOR_VALID_WEEK) {
    streakWeeks = profile.streak_weeks + 1;
    newLastStreakWeek = lastWeekStr;
  } else if (activeDaysLastWeek < MIN_ACTIVE_DAYS_FOR_VALID_WEEK && activeDaysTwoWeeksAgo < MIN_ACTIVE_DAYS_FOR_VALID_WEEK) {
    streakWeeks = 1;
    newLastStreakWeek = currentWeekStr;
  }

  return {
    ...updatePayload,
    streak_weeks: streakWeeks,
    last_streak_week_start: newLastStreakWeek,
  };
}

/** Nível máximo (Multiplicar) para contas admin e super_admin. */
const ADMIN_DEFAULT_LEVEL = 5;

function isPrivilegedJourneyAccountRole(role: unknown): boolean {
  const r = typeof role === 'string' ? role.trim().toLowerCase() : '';
  return r === 'admin' || r === 'super_admin';
}

function buildJourneySummaryFromLevel(
  level: number,
  totalXp: number,
  streakWeeks: number,
  progressPercent: number,
  xpInCurrentLevel: number,
  xpNeededForNextLevel: number,
  canLevelUp: boolean
): SpiritualJourneySummary {
  const levelInfo = SPIRITUAL_LEVELS.find((l) => l.level === level) ?? SPIRITUAL_LEVELS[0];
  return {
    totalXp,
    level,
    levelName: levelInfo.name,
    levelTitle: levelInfo.title,
    levelDescription: levelInfo.shortDescription,
    levelShortDescription: levelInfo.shortDescription,
    levelLongDescription: levelInfo.longDescription,
    levelInspirationalPhrase: levelInfo.inspirationalPhrase,
    levelVerse: levelInfo.verse,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progressPercent,
    streakWeeks,
    canLevelUp,
  };
}

/** Resumo para a tela da Jornada (nível, progresso, streak). Admins sempre no nível Multiplicar. */
export async function getJourneySummary(userId: string): Promise<SpiritualJourneySummary | null> {
  const { data: userRow } = await supabase.from('users').select('role').eq('id', userId).single();
  const isAdmin = isPrivilegedJourneyAccountRole((userRow as { role?: string } | null)?.role);
  const profile = await getOrCreateJourneyProfile(userId);
  if (!profile) {
    // Evita tela vazia quando o perfil ainda não foi criado por algum motivo (RLS/race/etc.).
    if (isAdmin) {
      return buildJourneySummaryFromLevel(ADMIN_DEFAULT_LEVEL, 0, 0, 100, 0, 0, false);
    }
    const initialInfo = getLevelInfo(0);
    const initialLevel = mapLegacyLevelToCurrent(initialInfo.level);
    return buildJourneySummaryFromLevel(
      initialLevel,
      0,
      0,
      initialInfo.progressPercent,
      initialInfo.xpInLevel,
      initialInfo.xpNeededInLevel,
      initialInfo.nextMinXp !== null
    );
  }

  if (isAdmin) {
    return buildJourneySummaryFromLevel(ADMIN_DEFAULT_LEVEL, profile.total_xp, profile.streak_weeks, 100, 0, 0, false);
  }

  const info = getLevelInfo(profile.total_xp);
  const effectiveLevel = mapLegacyLevelToCurrent(info.level);
  return buildJourneySummaryFromLevel(
    effectiveLevel,
    profile.total_xp,
    profile.streak_weeks,
    info.progressPercent,
    info.xpInLevel,
    info.xpNeededInLevel,
    info.nextMinXp !== null && profile.total_xp >= info.nextMinXp
  );
}

/** Cria reflexão espiritual e concede XP (1x/dia) */
export async function createReflection(userId: string, content: string): Promise<{ id?: string; xpAwarded: number }> {
  const { data: reflection, error: insertError } = await supabase
    .from('spiritual_reflections')
    .insert({ user_id: userId, content: content.trim() })
    .select('id')
    .single();

  if (insertError) {
    console.error('spiritualJourney.createReflection', insertError);
    return { xpAwarded: 0 };
  }

  const { xpAwarded } = await awardXp(userId, 'reflection', {
    referenceId: reflection?.id,
    referenceType: 'spiritual_reflection',
  });

  notifyAchievementUnlockIfNew(userId, 'reflections_count').catch(() => {});

  return { id: reflection?.id, xpAwarded };
}

/** Lista reflexões do usuário (mais recentes primeiro) */
export async function getReflections(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('spiritual_reflections')
    .select('id, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}
