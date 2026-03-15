/**
 * Serviço de Disciplinas Espirituais
 * Checklist privado: cada check gera log, XP e atualiza streak na Jornada.
 */

import { supabase } from './supabase';
import { awardXp } from './spiritualJourney';
import { notifyAchievementUnlockIfNew } from './achievementsService';
import {
  getDisciplinesByCategory,
  getDisciplineByKey,
  type SpiritualDiscipline,
  type DisciplineCategory,
} from '../constants/spiritualDisciplines';

/** Retorna disciplinas do banco ou fallback das constantes */
export async function getDisciplines(): Promise<{ daily: SpiritualDiscipline[]; weekly: SpiritualDiscipline[]; monthly: SpiritualDiscipline[] }> {
  try {
    const { data, error } = await supabase
      .from('spiritual_disciplines')
      .select('key, title_pt, category, xp_amount, sort_order')
      .order('sort_order', { ascending: true });

    if (error || !data?.length) return getDisciplinesByCategory();

    const list: SpiritualDiscipline[] = data.map((r: any) => {
      const fromConstants = getDisciplineByKey(r.key);
      return {
        key: r.key,
        title: r.title_pt,
        category: r.category,
        xpAmount: fromConstants?.xpAmount ?? r.xp_amount ?? 5,
        sortOrder: r.sort_order ?? 0,
      };
    });
    const daily = list.filter((d) => d.category === 'daily').sort((a, b) => a.sortOrder - b.sortOrder);
    const weekly = list.filter((d) => d.category === 'weekly').sort((a, b) => a.sortOrder - b.sortOrder);
    const monthly = list.filter((d) => d.category === 'monthly').sort((a, b) => a.sortOrder - b.sortOrder);
    return { daily, weekly, monthly };
  } catch (_) {
    return getDisciplinesByCategory();
  }
}

/** Início do dia/semana/mês em ISO (fuso local do dispositivo) */
function periodStart(period: 'day' | 'week' | 'month'): string {
  const now = new Date();
  if (period === 'day') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return d.toISOString();
  }
  if (period === 'week') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString();
  }
  const d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return d.toISOString();
}

/** Conclusões do usuário no período (para exibir o check verde). Usa spiritual_discipline_completions (onde gravamos cada check). */
export async function getCompletionsInPeriod(
  userId: string,
  period: 'day' | 'week' | 'month'
): Promise<Set<string>> {
  const start = periodStart(period);
  const { data, error } = await supabase
    .from('spiritual_discipline_completions')
    .select('discipline_key')
    .eq('user_id', userId)
    .gte('completed_at', start);

  if (error) return new Set();
  const keys = (data ?? []).map((r: any) => r.discipline_key).filter(Boolean);
  return new Set(keys);
}

/** Conclusões hoje (diárias), esta semana (semanais), este mês (mensais) */
export async function getCompletionSets(userId: string): Promise<{
  completedDaily: Set<string>;
  completedWeekly: Set<string>;
  completedMonthly: Set<string>;
}> {
  const [completedDaily, completedWeekly, completedMonthly] = await Promise.all([
    getCompletionsInPeriod(userId, 'day'),
    getCompletionsInPeriod(userId, 'week'),
    getCompletionsInPeriod(userId, 'month'),
  ]);
  return { completedDaily, completedWeekly, completedMonthly };
}

/**
 * Marca disciplina como concluída: grava log e concede XP.
 * Respeita: 1x por dia (diária), 1x por semana (semanal), 1x por mês (mensal) e limite diário de XP.
 * Sempre registra a conclusão em spiritual_discipline_completions (para conquistas),
 * mesmo quando o limite diário de XP impede a concessão.
 */
export async function completeDiscipline(
  userId: string,
  disciplineKey: string
): Promise<{ success: boolean; xpAwarded: number; message?: string }> {
  const discipline = getDisciplineByKey(disciplineKey);
  if (!discipline) return { success: false, xpAwarded: 0, message: 'Disciplina não encontrada.' };

  const period = discipline.category === 'daily' ? 'day' : discipline.category === 'weekly' ? 'week' : 'month';
  const completedInPeriod = await getCompletionsInPeriod(userId, period);
  if (completedInPeriod.has(disciplineKey)) {
    const periodLabel = discipline.category === 'daily' ? 'já marcada hoje' : discipline.category === 'weekly' ? 'já marcada esta semana' : 'já marcada este mês';
    return { success: false, xpAwarded: 0, message: `Esta disciplina foi ${periodLabel}.` };
  }

  const { xpAwarded } = await awardXp(userId, 'discipline', {
    referenceId: disciplineKey,
    referenceType: 'discipline',
    xpOverride: discipline.xpAmount,
  });

  try {
    await supabase.from('spiritual_discipline_completions').insert({
      user_id: userId,
      discipline_key: disciplineKey,
      xp_awarded: xpAwarded,
    });
  } catch (e) {
    console.error('spiritualDisciplines.completeDiscipline log', e);
    return { success: false, xpAwarded: 0, message: 'Erro ao registrar. Tente novamente.' };
  }

  if (disciplineKey === 'fast') {
    notifyAchievementUnlockIfNew(userId, 'fast_completed').catch(() => {});
  }
  notifyAchievementUnlockIfNew(userId, 'disciplines_streak').catch(() => {});

  const successMsg = xpAwarded > 0 ? `+${xpAwarded} XP` : 'Registrado!';
  return { success: true, xpAwarded, message: successMsg };
}

/** Progresso semanal: quantos dias da semana o usuário marcou ao menos uma disciplina diária */
export async function getWeeklyProgress(userId: string): Promise<{ daysWithActivity: number; totalDays: number }> {
  const start = periodStart('week');
  const { data, error } = await supabase
    .from('spiritual_xp_events')
    .select('created_at')
    .eq('user_id', userId)
    .eq('action_type', 'discipline')
    .gte('created_at', start);

  if (error) return { daysWithActivity: 0, totalDays: 7 };
  const dates = new Set((data ?? []).map((r: any) => r.created_at?.split('T')[0]).filter(Boolean));
  return { daysWithActivity: dates.size, totalDays: 7 };
}
