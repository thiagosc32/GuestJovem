/**
 * Planos de leitura personalizados.
 * Armazenados localmente em AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomReadingPlan, DailyReading } from '../constants/bibleReadingPlans';
import { BOOK_NAMES } from '../constants/bibleReadingPlans';

const CUSTOM_PLANS_KEY = 'bible_custom_plans';

export async function getCustomPlans(): Promise<CustomReadingPlan[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_PLANS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return (Array.isArray(arr) ? arr : []).map((p: any) => hydrateCustomPlan(p));
  } catch {
    return [];
  }
}

function hydrateCustomPlan(p: { id: string; name: string; description: string; readings: DailyReading[][]; totalDays?: number }): CustomReadingPlan {
  const readings = p.readings || [];
  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    totalDays: p.totalDays ?? readings.length,
    readings,
    getReadingForDay: (day) => readings[day - 1] ?? [],
  };
}

export async function saveCustomPlan(plan: CustomReadingPlan): Promise<void> {
  const plans = await getCustomPlans();
  const idx = plans.findIndex((p) => p.id === plan.id);
  if (idx >= 0) {
    plans[idx] = plan;
  } else {
    plans.push(plan);
  }
  await AsyncStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(plans));
}

export async function deleteCustomPlan(planId: string): Promise<void> {
  const plans = (await getCustomPlans()).filter((p) => p.id !== planId);
  await AsyncStorage.setItem(CUSTOM_PLANS_KEY, JSON.stringify(plans));
}

export function createCustomPlan(
  name: string,
  description: string,
  readings: DailyReading[][]
): CustomReadingPlan {
  const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    name,
    description,
    totalDays: readings.length,
    readings,
    getReadingForDay: (day) => readings[day - 1] ?? [],
  };
}

export function toBibleReadingPlan(custom: CustomReadingPlan): CustomReadingPlan {
  return custom;
}
