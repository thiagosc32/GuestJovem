/**
 * Progresso de leitura dos planos bíblicos.
 * Persiste em AsyncStorage: quais leituras o usuário já marcou como concluídas.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROGRESS_KEY = 'bible_reading_progress';

/** Chave: planId|dayIndex|readingIndex (0-based) */
function progressKey(planId: string, dayIndex: number, readingIndex: number): string {
  return `${planId}|${dayIndex}|${readingIndex}`;
}

/** Marca uma leitura como concluída. */
export async function markReadingComplete(
  planId: string,
  dayIndex: number,
  readingIndex: number
): Promise<void> {
  const key = progressKey(planId, dayIndex, readingIndex);
  const data = await loadProgress();
  data[key] = new Date().toISOString();
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
}

/** Verifica se uma leitura específica foi concluída. */
export async function isReadingComplete(
  planId: string,
  dayIndex: number,
  readingIndex: number
): Promise<boolean> {
  const key = progressKey(planId, dayIndex, readingIndex);
  const data = await loadProgress();
  return !!data[key];
}

/** Retorna todas as chaves concluídas para um plano. */
export async function getPlanProgress(planId: string): Promise<Record<string, string>> {
  const data = await loadProgress();
  const prefix = `${planId}|`;
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith(prefix)) result[k] = v;
  }
  return result;
}

/** Verifica se a leitura (dayIndex, readingIndex) está concluída. */
export function isReadingCompleteSync(
  progress: Record<string, string>,
  planId: string,
  dayIndex: number,
  readingIndex: number
): boolean {
  return !!progress[progressKey(planId, dayIndex, readingIndex)];
}

/** Encontra o próximo dia/leitura não concluída. Retorna { day: 1-based, readingIndex } ou null se tudo concluído. */
export function getNextReading(
  progress: Record<string, string>,
  planId: string,
  totalDays: number,
  getReadingsCount: (day: number) => number
): { day: number; readingIndex: number } | null {
  for (let d = 1; d <= totalDays; d++) {
    const count = getReadingsCount(d);
    for (let r = 0; r < count; r++) {
      if (!isReadingCompleteSync(progress, planId, d - 1, r)) {
        return { day: d, readingIndex: r };
      }
    }
  }
  return null;
}

/** Conta quantas leituras foram concluídas no plano. */
export function countCompletedReadings(
  progress: Record<string, string>,
  planId: string,
  totalDays: number,
  getReadingsCount: (day: number) => number
): number {
  let n = 0;
  for (let d = 1; d <= totalDays; d++) {
    const count = getReadingsCount(d);
    for (let r = 0; r < count; r++) {
      if (isReadingCompleteSync(progress, planId, d - 1, r)) n++;
    }
  }
  return n;
}

export async function loadProgress(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
