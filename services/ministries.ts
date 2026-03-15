import { supabase } from './supabase';

export type Ministry = {
  id: string;
  ministry_key: string;
  name: string;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  default_schedule_type?: string | null;
};

export const getMinistries = async (includeInactive = false): Promise<Ministry[]> => {
  const query = supabase
    .from('ministries')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (!includeInactive) {
    query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Ministry[]) ?? [];
};

export const createMinistry = async (params: {
  ministry_key: string;
  name: string;
  color?: string | null;
  sort_order?: number;
  default_schedule_type?: string | null;
}) => {
  const payload = {
    ...params,
    color: params.color ?? null,
    sort_order: params.sort_order ?? 0,
    default_schedule_type: params.default_schedule_type ?? null,
  };
  const { data, error } = await supabase.from('ministries').insert(payload).select().single();
  if (error) throw error;
  return data as Ministry;
};

export const updateMinistry = async (
  id: string,
  updates: {
    ministry_key?: string;
    name?: string;
    color?: string | null;
    is_active?: boolean;
    sort_order?: number;
    default_schedule_type?: string | null;
  }
) => {
  const { data, error } = await supabase.from('ministries').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Ministry;
};

export const deleteMinistry = async (id: string) => {
  const { error } = await supabase.from('ministries').delete().eq('id', id);
  if (error) throw error;
};

/** Exclui ministério pelo identificador (útil quando o item veio do fallback ou para garantir exclusão por chave). */
export const deleteMinistryByKey = async (ministryKey: string) => {
  const { error } = await supabase.from('ministries').delete().eq('ministry_key', ministryKey);
  if (error) throw error;
};

/** Busca um ministério pelo ministry_key (para obter default_schedule_type na agenda). */
export const getMinistryByKey = async (ministryKey: string): Promise<Ministry | null> => {
  const { data, error } = await supabase.from('ministries').select('*').eq('ministry_key', ministryKey).maybeSingle();
  if (error) throw error;
  return (data as Ministry) ?? null;
};

