/**
 * Serviço de cronograma de eventos do ministério.
 */

import { supabase } from './supabase';

export const getMinistryEventSchedule = async (eventId: string) => {
  const { data, error } = await supabase
    .from('ministry_event_schedule')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

export const upsertMinistryEventScheduleItem = async (params: {
  event_id: string;
  step_type: string;
  responsible_name?: string | null;
  sort_order?: number;
}) => {
  const { data, error } = await supabase
    .from('ministry_event_schedule')
    .upsert(params, { onConflict: 'event_id,step_type' })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteMinistryEventScheduleItem = async (eventId: string, stepType: string) => {
  const { error } = await supabase.from('ministry_event_schedule').delete().eq('event_id', eventId).eq('step_type', stepType);
  if (error) throw error;
};
