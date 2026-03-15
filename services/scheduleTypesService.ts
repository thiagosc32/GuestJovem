/**
 * CRUD de tipos de escala (cronogramas) para admins.
 */

import { supabase } from './supabase';

export type ScheduleType = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ScheduleTypeStep = {
  id: string;
  schedule_type_id: string;
  step_type: string;
  label: string;
  description: string | null;
  sort_order: number;
};

export const getScheduleTypes = async (): Promise<ScheduleType[]> => {
  const { data, error } = await supabase
    .from('schedule_types')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });
  if (error) throw error;
  return (data as ScheduleType[]) ?? [];
};

export const getScheduleTypeSteps = async (scheduleTypeId: string): Promise<ScheduleTypeStep[]> => {
  const { data, error } = await supabase
    .from('schedule_type_steps')
    .select('*')
    .eq('schedule_type_id', scheduleTypeId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data as ScheduleTypeStep[]) ?? [];
};

export const getScheduleTypeByKey = async (key: string): Promise<ScheduleType | null> => {
  const { data, error } = await supabase.from('schedule_types').select('*').eq('key', key).maybeSingle();
  if (error) throw error;
  return (data as ScheduleType) ?? null;
};

/** Retorna tipos no formato { id, label } para uso na agenda (com fallback em constantes se vazio). */
export const getScheduleTypesForAgenda = async (): Promise<{ id: string; label: string }[]> => {
  const list = await getScheduleTypes();
  return list.map((t) => ({ id: t.key, label: t.label }));
};

/** Retorna etapas de um tipo por key (para agenda). */
export const getStepsForTypeKey = async (typeKey: string): Promise<{ step_type: string; label: string; description?: string }[]> => {
  const type = await getScheduleTypeByKey(typeKey);
  if (!type) return [];
  const steps = await getScheduleTypeSteps(type.id);
  return steps.map((s) => ({ step_type: s.step_type, label: s.label, description: s.description ?? undefined }));
};

export const createScheduleType = async (params: {
  key: string;
  label: string;
  sort_order?: number;
  steps?: { step_type: string; label: string; description?: string | null; sort_order?: number }[];
}): Promise<ScheduleType> => {
  const { data: typeData, error: typeError } = await supabase
    .from('schedule_types')
    .insert({
      key: params.key.trim().toLowerCase().replace(/\s+/g, '_'),
      label: params.label.trim(),
      sort_order: params.sort_order ?? 0,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (typeError) throw typeError;
  const type = typeData as ScheduleType;

  if (params.steps?.length) {
    const rows = params.steps.map((s, i) => ({
      schedule_type_id: type.id,
      step_type: s.step_type.trim().toLowerCase().replace(/\s+/g, '_'),
      label: s.label.trim(),
      description: s.description?.trim() || null,
      sort_order: s.sort_order ?? i,
    }));
    const { error: stepsError } = await supabase.from('schedule_type_steps').insert(rows);
    if (stepsError) throw stepsError;
  }
  return type;
};

export const updateScheduleType = async (
  id: string,
  updates: { label?: string; sort_order?: number },
  steps?: { id?: string; step_type: string; label: string; description?: string | null; sort_order?: number }[]
): Promise<ScheduleType> => {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.label !== undefined) payload.label = updates.label.trim();
  if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;

  const { data, error } = await supabase.from('schedule_types').update(payload).eq('id', id).select().single();
  if (error) throw error;

  if (steps !== undefined) {
    const existing = await getScheduleTypeSteps(id);
    const byStepType = new Map(existing.map((s) => [s.step_type, s]));
    const payloadStepTypes = new Set(steps.map((s) => s.step_type.trim().toLowerCase().replace(/\s+/g, '_')));

    for (const s of existing) {
      if (!payloadStepTypes.has(s.step_type)) {
        await supabase.from('schedule_type_steps').delete().eq('id', s.id);
      }
    }
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const step_type = s.step_type.trim().toLowerCase().replace(/\s+/g, '_');
      const row = {
        schedule_type_id: id,
        step_type,
        label: s.label.trim(),
        description: s.description?.trim() || null,
        sort_order: s.sort_order ?? i,
      };
      const existingStep = byStepType.get(step_type);
      if (existingStep) {
        await supabase.from('schedule_type_steps').update({ label: row.label, description: row.description, sort_order: row.sort_order }).eq('id', existingStep.id);
      } else {
        await supabase.from('schedule_type_steps').insert(row);
      }
    }
  }
  return data as ScheduleType;
};

/** Retorna quantidade de eventos que usam este tipo (schedule_type = key). */
export const countEventsUsingScheduleType = async (typeKey: string): Promise<number> => {
  const { count, error } = await supabase
    .from('ministry_calendar_events')
    .select('*', { count: 'exact', head: true })
    .eq('schedule_type', typeKey);
  if (error) throw error;
  return count ?? 0;
};

export const deleteScheduleType = async (id: string): Promise<void> => {
  const { data: type, error: fetchErr } = await supabase.from('schedule_types').select('key').eq('id', id).single();
  if (fetchErr || !type) throw new Error('Tipo de escala não encontrado');
  const key = (type as { key: string }).key;
  const count = await countEventsUsingScheduleType(key);
  if (count > 0) {
    throw new Error(`Existem ${count} evento(s) usando esta escala. Altere ou remova a escala deles antes de excluir.`);
  }
  const { error: delErr } = await supabase.from('schedule_types').delete().eq('id', id);
  if (delErr) throw delErr;
};
