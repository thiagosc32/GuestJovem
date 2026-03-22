import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

type ExtraShape = {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  /** URL pública do app (web PWA / Vercel). Usada em links dos e-mails Auth (SMTP). */
  EXPO_PUBLIC_WEB_URL?: string;
};

// Garante string e remove espaços/quebras/BOM (no Android o extra às vezes vem com \r\n ou tipo errado)
function normalizeEnvValue(val: unknown): string {
  if (val == null) return '';
  const s = typeof val === 'string' ? val : String(val);
  return s.replace(/\s+/g, ' ').replace(/^\uFEFF/, '').trim();
}

// Lê extra de todas as fontes que o Expo pode expor (expoConfig.extra em produção Android às vezes falha)
function getExtra(): ExtraShape | undefined {
  const c = Constants as unknown as {
    expoConfig?: { extra?: ExtraShape };
    manifest?: { extra?: ExtraShape };
    manifest2?: { extra?: ExtraShape };
  };
  return c.expoConfig?.extra ?? c.manifest2?.extra ?? c.manifest?.extra;
}

function getSupabaseEnv(): { url: string; key: string } {
  const fromEnv = {
    url: normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_URL),
    key: normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  };
  const extra = getExtra();
  return {
    url: fromEnv.url || normalizeEnvValue(extra?.EXPO_PUBLIC_SUPABASE_URL),
    key: fromEnv.key || normalizeEnvValue(extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  };
}

function normalizeAndValidateUrl(url: string): string {
  let u = url.replace(/\s+/g, ' ').replace(/^\uFEFF/, '').trim();
  if (u && !u.startsWith('http://') && !u.startsWith('https://') && u.includes('supabase')) {
    u = 'https://' + u.replace(/^\s*https?:\/\//i, '');
  }
  return u;
}

function createSupabaseClientOnce(url: string, key: string): ReturnType<typeof createClient<Database>> | null {
  const isValidUrl = url.length > 0 && (url.startsWith('https://') || url.startsWith('http://'));
  if (!url || !key || !isValidUrl) return null;

  try {
    const noOpLock = (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => fn();
    const client = createClient<Database>(url, key, {
      auth: {
        storage: AsyncStorage,
        lock: noOpLock,
        lockAcquireTimeout: 60000,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        /**
         * iOS/Android: implicit evita edge cases com tokens em alguns fluxos de deep link.
         * Na web mantemos PKCE (padrão) para OAuth/PWA e links de confirmação de e-mail.
         */
        ...(Platform.OS !== 'web' ? { flowType: 'implicit' as const } : {}),
      },
    });
    if (Platform.OS !== 'web') {
      client.auth.startAutoRefresh();
      AppState.addEventListener('change', (state) => {
        if (state === 'active') client.auth.startAutoRefresh();
        else client.auth.stopAutoRefresh();
      });
    }
    return client;
  } catch (error) {
    if (__DEV__) console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

// Tenta criar o client já no carregamento do módulo (quando extra/env estão disponíveis)
function tryInitAtLoad(): ReturnType<typeof createClient<Database>> | null {
  const { url: rawUrl, key: rawKey } = getSupabaseEnv();
  const url = normalizeAndValidateUrl(rawUrl);
  const key = rawKey.replace(/\s+/g, ' ').replace(/\uFEFF/g, '').trim();
  return createSupabaseClientOnce(url, key);
}

let supabaseClient: ReturnType<typeof createClient<Database>> | null = tryInitAtLoad();

function ensureSupabaseClient(): void {
  if (supabaseClient) return;

  const { url: rawUrl, key: rawKey } = getSupabaseEnv();
  const supabaseUrl = normalizeAndValidateUrl(rawUrl);
  const supabaseAnonKey = rawKey.replace(/\s+/g, ' ').replace(/\uFEFF/g, '').trim();
  const isValidUrl = supabaseUrl.length > 0 && (supabaseUrl.startsWith('https://') || supabaseUrl.startsWith('http://'));

  if (!supabaseUrl || !supabaseAnonKey || !isValidUrl) {
    if (__DEV__) {
      console.warn(
        '[Supabase] URL or Key missing/invalid. extraKeys=[%s]',
        Object.keys(getExtra() || {}).join(', ')
      );
    }
    return;
  }

  supabaseClient = createSupabaseClientOnce(supabaseUrl, supabaseAnonKey);
}

/**
 * Cliente Supabase. Inicialização preguiçosa para que Constants.expoConfig/extra
 * esteja disponível (em alguns builds Android o extra só aparece após o app iniciar).
 */
export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_, prop) {
    ensureSupabaseClient();
    if (supabaseClient) return (supabaseClient as Record<string | symbol, unknown>)[prop];
    throw new Error('Supabase client not initialized');
  },
});

/** Indica se o Supabase está configurado. Chama ensureSupabaseClient para leitura em tempo de uso. */
export const isSupabaseConfigured = (): boolean => {
  ensureSupabaseClient();
  return !!supabaseClient;
};

/**
 * URL de retorno após cliques em links dos e-mails do Auth (reset de senha, magic link, etc.).
 * Deve estar em Supabase → Authentication → URL Configuration → Redirect URLs.
 * Prioridade: EXPO_PUBLIC_WEB_URL (produção) → na web `window.location.origin` → deep link Expo (`guestjovem://` / exp://...).
 */
export function getAuthEmailRedirectUrl(): string {
  const extra = getExtra();
  const fromEnv =
    normalizeEnvValue(process.env.EXPO_PUBLIC_WEB_URL) ||
    normalizeEnvValue(extra?.EXPO_PUBLIC_WEB_URL);
  const withSlash = (u: string) => (u.endsWith('/') ? u : `${u}/`);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (fromEnv) return withSlash(fromEnv);
    return withSlash(window.location.origin);
  }
  if (fromEnv) return withSlash(fromEnv);
  try {
    return withSlash(Linking.createURL('/'));
  } catch {
    return 'guestjovem://';
  }
}

// Auth Helper Functions
export const signIn = async (email: string, password: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

/**
 * Cadastro com confirmação por e-mail (template "Confirm signup" no Supabase).
 * O trigger `handle_new_auth_user` cria a linha em `public.users` a partir de `user_metadata.name`.
 * Se "Confirm email" estiver desligado no projeto, `data.session` vem preenchido e o usuário já entra logado.
 */
export const signUp = async (email: string, password: string, name: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const trimmedName = name.trim();
  const { data, error } = await supabaseClient.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { name: trimmedName, full_name: trimmedName },
      emailRedirectTo: getAuthEmailRedirectUrl(),
    },
  });
  if (error) throw error;

  // Com sessão imediata (confirmação de e-mail desativada): garante perfil se o trigger não existir no projeto.
  if (data.session && data.user) {
    const { data: existing } = await supabaseClient.from('users').select('id').eq('id', data.user.id).maybeSingle();
    if (!existing) {
      const { error: profileError } = await supabaseClient.from('users').insert({
        id: data.user.id,
        email: data.user.email ?? email.trim(),
        name: trimmedName,
        role: 'user',
        created_at: new Date().toISOString(),
      });
      if (profileError && profileError.code !== '23505') throw profileError;
    }
  }

  return data;
};

export const signOut = async () => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
};

/** Envia email de redefinição de senha para o endereço informado (usa SMTP do projeto se configurado). */
export const resetPassword = async (email: string): Promise<void> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: getAuthEmailRedirectUrl(),
  });
  if (error) throw error;
};

const GOOGLE_REDIRECT_SCHEME = 'guestjovem://google-auth';

/**
 * Inicia o fluxo de login com Google (OAuth). Retorna a URL para abrir no browser.
 * No celular, passe redirectTo = Linking.createURL('google-auth') para o redirect abrir o app
 * (Expo Go ou build). No Supabase Dashboard, adicione em Redirect URLs tanto
 * guestjovem://google-auth quanto a URL exp:// que aparecer no console (para Expo Go).
 */
export const getGoogleSignInUrl = async (redirectTo?: string): Promise<string> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo ?? GOOGLE_REDIRECT_SCHEME,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('URL de login Google não retornada.');
  return data.url;
};

/** Define a sessão a partir dos tokens retornados no redirect OAuth (hash da URL). */
export const setSessionFromOAuthUrl = async (url: string): Promise<void> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const hash = url.split('#')[1];
  if (!hash) throw new Error('URL de callback sem fragmento.');
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) throw new Error('Tokens não encontrados na URL.');
  const { error } = await supabaseClient.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
};

/** Cria perfil em public.users para usuário que entrou via OAuth (ex.: Google) se ainda não existir. */
export const ensureUserProfileForOAuth = async (): Promise<void> => {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  const user = session?.user;
  if (!user) return;
  const { data: existing } = await supabaseClient.from('users').select('id').eq('id', user.id).single();
  if (existing) return;
  const email = user.email ?? '';
  const name = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? email.split('@')[0] ?? 'Usuário') as string;
  await supabaseClient.from('users').insert({
    id: user.id,
    email,
    name,
    role: 'user',
    created_at: new Date().toISOString(),
  });
};

export { GOOGLE_REDIRECT_SCHEME };

/**
 * Retorna o usuário atual com perfil (users). Usa getSession() primeiro (sessão em cache,
 * ideal para React Native) e só chama getUser() se precisar refrescar.
 */
export const getCurrentUser = async () => {
  if (!supabaseClient) return null;

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      if (__DEV__) console.error('Error fetching user profile:', error);
      return null;
    }
    return data;
  } catch (error) {
    if (__DEV__) console.error('Error in getCurrentUser:', error);
    return null;
  }
};

// User Queries
export const getUserProfile = async (userId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('users')
    .select('*, youth_profiles(*)')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

export const updateUserProfile = async (userId: string, updates: Partial<Database['public']['Tables']['users']['Update']>) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateUserRole = async (userId: string, role: 'user' | 'admin') => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('users')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  try {
    await createNotification({
      user_id: userId,
      type: 'announcement',
      title: 'Seu nível de conta foi alterado',
      message: role === 'admin' ? 'Você agora tem acesso de administrador.' : 'Seu acesso foi definido como usuário.',
      action_url: undefined,
    });
  } catch (_) {}
  return data;
};

export const getAllUsers = async () => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('users')
    .select('*, youth_profiles(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Devotional Queries
export const getDevotionals = async (limit: number = 20, offset: number = 0) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('devotionals')
    .select('*')
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
};

export const getDevotionalById = async (id: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('devotionals')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createDevotional = async (devotional: Database['public']['Tables']['devotionals']['Insert']) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('devotionals')
    .insert(devotional)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteDevotional = async (id: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.rpc('delete_devotional_admin', { p_id: id });
  if (error) throw error;
};

// Prayer Request Queries
export const getPrayerRequests = async (limit: number = 20, offset: number = 0) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('prayer_requests')
    .select('*, users!prayer_requests_user_id_fkey(name, avatar_url)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
};

export const createPrayerRequest = async (request: Database['public']['Tables']['prayer_requests']['Insert']) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('prayer_requests')
    .insert(request)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const incrementPrayerCount = async (requestId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.rpc('increment_prayer_count', { request_id: requestId });
  if (error) throw error;
  return data;
};

/** Retorna os IDs dos pedidos pelos quais o usuário já orou (para toggle: segundo clique subtrai) */
export const getPrayedRequestIds = async (userId: string): Promise<string[]> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('prayer_request_prayers')
    .select('request_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.request_id);
};

/** Toggle orar: se já orou remove e decrementa; senão adiciona e incrementa. Retorna { hasPrayed, newCount } */
export const togglePray = async (
  requestId: string,
  userId: string
): Promise<{ hasPrayed: boolean; newCount: number }> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.rpc('toggle_pray', {
    p_user_id: userId,
    p_request_id: requestId,
  });
  if (error) throw error;
  const row = Array.isArray(data) && data[0] ? data[0] : { has_prayed: false, new_count: 0 };
  const hasPrayed = !!row.has_prayed;
  if (hasPrayed) {
    const author = await getPrayerRequestById(requestId);
    if (author?.user_id && author.user_id !== userId) {
      try {
        await createNotification({
          user_id: author.user_id,
          type: 'prayer',
          title: 'Alguém orou pelo seu pedido',
          message: 'Uma pessoa da comunidade orou pelo seu pedido de oração. Toque para ver.',
          action_url: 'prayer_request:' + requestId,
        });
      } catch (_) {}
    }
  }
  return { hasPrayed, newCount: Number(row.new_count) ?? 0 };
};

/** Retorna user_id e title de um pedido (para notificações). */
export const getPrayerRequestById = async (requestId: string): Promise<{ user_id: string; title: string } | null> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('prayer_requests')
    .select('user_id, title')
    .eq('id', requestId)
    .single();
  if (error || !data) return null;
  return { user_id: data.user_id, title: (data as any).title ?? 'Pedido de oração' };
};

export const getMyPrayerRequests = async (userId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('prayer_requests')
    .select('*, users!prayer_requests_user_id_fkey(name, avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const updatePrayerRequest = async (
  requestId: string,
  updates: { title?: string; description?: string; category?: string; is_public?: boolean }
) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('prayer_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deletePrayerRequest = async (requestId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.from('prayer_requests').delete().eq('id', requestId);
  if (error) throw error;
};

/** Pedidos privados (para admins): lista onde is_public = false, com nome do autor */
export const getPrivatePrayerRequests = async () => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('prayer_requests')
    .select('*, users!prayer_requests_user_id_fkey(name)')
    .eq('is_public', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

/** Notificar admins quando um pedido privado é criado */
export const notifyAdminsOfPrivatePrayerRequest = async (requestId: string, title: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data: admins } = await supabaseClient.from('users').select('id').eq('role', 'admin');
  if (!admins?.length) return;
  const rows = admins.map((a: any) => ({
    user_id: a.id,
    type: 'prayer',
    title: 'Novo pedido de oração privado',
    message: title || 'Um jovem enviou um pedido de oração privado.',
    action_url: `prayer_private`,
  }));
  await supabaseClient.from('notifications').insert(rows);
};

export const markPrayerAnswered = async (requestId: string, testimony: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('prayer_requests')
    .update({ is_answered: true, testimony, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Resposta da liderança em pedido privado (campo leadership_message, não testimony).
 * authorUserId: opcional; se passado (ex.: pela tela admin), garante que a notificação vá para o autor correto. */
export const markPrivatePrayerAnswered = async (
  requestId: string,
  leadershipMessage: string,
  authorUserId?: string
) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const author = authorUserId ? null : await getPrayerRequestById(requestId);
  const { data, error } = await supabaseClient
    .from('prayer_requests')
    .update({
      is_answered: true,
      leadership_message: leadershipMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();
  if (error) throw error;
  const userId = authorUserId ?? author?.user_id ?? (data as any)?.user_id;
  if (userId) {
    await createNotification({
      user_id: userId,
      type: 'prayer',
      title: 'Sua oração privada foi respondida',
      message: 'A liderança enviou uma resposta ao seu pedido de oração. Toque para ver.',
      action_url: 'prayer_request:' + requestId,
    });
  }
  return data;
};

export const getPrayerRequestComments = async (requestId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data: rows, error } = await supabaseClient
    .from('prayer_request_comments')
    .select('id, prayer_request_id, user_id, content, created_at')
    .eq('prayer_request_id', requestId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const list = rows ?? [];
  if (list.length === 0) return [];
  const userIds = [...new Set(list.map((r: any) => r.user_id).filter(Boolean))] as string[];
  let userMap: Record<string, { name: string; avatar_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabaseClient.from('users').select('id, name, avatar_url').in('id', userIds);
    userMap = (users ?? []).reduce((acc: Record<string, { name: string; avatar_url: string | null }>, u: any) => {
      acc[u.id] = { name: u.name || 'Usuário', avatar_url: u.avatar_url ?? null };
      return acc;
    }, {});
  }
  return list.map((r: any) => {
    const profile = userMap[r.user_id];
    return {
      id: r.id,
      prayer_request_id: r.prayer_request_id,
      user_id: r.user_id,
      content: r.content,
      created_at: r.created_at,
      userName: profile?.name ?? 'Usuário',
      userAvatar: profile?.avatar_url ?? null,
    };
  });
};

export const createPrayerRequestComment = async (
  prayerRequestId: string,
  userId: string,
  content: string
) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('prayer_request_comments')
    .insert({ prayer_request_id: prayerRequestId, user_id: userId, content: content.trim() })
    .select()
    .single();
  if (error) throw error;
  const { data: req } = await supabaseClient.from('prayer_requests').select('user_id').eq('id', prayerRequestId).single();
  if (req?.user_id && req.user_id !== userId) {
    try {
      await createNotification({
        user_id: req.user_id,
        type: 'prayer',
        title: 'Novo comentário no seu pedido de oração',
        message: 'Alguém comentou no seu pedido. Toque para ver.',
        action_url: 'prayer_request:' + prayerRequestId,
      });
    } catch (_) {}
  }
  return data;
};

export const updatePrayerRequestComment = async (commentId: string, content: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('prayer_request_comments')
    .update({ content: content.trim() })
    .eq('id', commentId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deletePrayerRequestComment = async (commentId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.from('prayer_request_comments').delete().eq('id', commentId);
  if (error) throw error;
};

// Event Queries
export const getEventById = async (eventId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('events')
    .select('id, title, date, time, location')
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const getEvents = async (limit: number = 20, offset: number = 0) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('events')
    .select('*, event_rsvps(count)')
    .order('date', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
};

export const createEvent = async (event: Database['public']['Tables']['events']['Insert']) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  const eventTitle = (data as any)?.title ?? 'Novo evento';
  const eventId = (data as any)?.id;
  try {
    await supabaseClient.rpc('notify_users_with_role', {
      p_role: 'user',
      p_type: 'event',
      p_title: 'Novo evento disponível',
      p_message: `"${eventTitle}" — confira e confirme sua presença.`,
      p_action_url: eventId ? 'event:' + eventId : null,
    });
  } catch (_) {}
  return data;
};

export const createEventRSVP = async (eventId: string, userId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data: ev } = await supabaseClient.from('events').select('title').eq('id', eventId).single();
  const eventTitle = (ev as any)?.title ?? 'evento';
  const { data, error } = await supabaseClient
    .from('event_rsvps')
    .insert({ event_id: eventId, user_id: userId, status: 'confirmed' })
    .select()
    .single();

  if (error) throw error;
  try {
    await createNotification({
      user_id: userId,
      type: 'event',
      title: 'Presença confirmada',
      message: `Você confirmou presença em "${eventTitle}". Até lá!`,
      action_url: 'event:' + eventId,
    });
  } catch (_) {}
  return data;
};

export const getUserRSVPs = async (userId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('event_rsvps')
    .select('event_id')
    .eq('user_id', userId)
    .eq('status', 'confirmed');

  if (error) throw error;
  return data.map((rsvp) => rsvp.event_id);
};

// Community Post Queries (Mesa Guest Jovem)
export const getCommunityPosts = async (limit: number = 20, offset: number = 0) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('community_posts')
    .select('*, users!community_posts_user_id_fkey(name, avatar_url)')
    .eq('is_moderated', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
};

export const createCommunityPost = async (post: Database['public']['Tables']['community_posts']['Insert']) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('community_posts')
    .insert(post)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const incrementPostLikes = async (postId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.rpc('increment_post_likes', { post_id: postId });
  if (error) throw error;
  return data;
};

export const getCommunityPostComments = async (postId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data: rows, error } = await supabaseClient
    .from('community_post_comments')
    .select('id, post_id, user_id, content, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const list = rows ?? [];
  if (list.length === 0) return [];
  const userIds = [...new Set(list.map((r: any) => r.user_id).filter(Boolean))] as string[];
  let userMap: Record<string, { name: string; avatar_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabaseClient.from('users').select('id, name, avatar_url').in('id', userIds);
    userMap = (users ?? []).reduce((acc: Record<string, { name: string; avatar_url: string | null }>, u: any) => {
      acc[u.id] = { name: u.name || 'Usuário', avatar_url: u.avatar_url ?? null };
      return acc;
    }, {});
  }
  return list.map((r: any) => {
    const profile = userMap[r.user_id];
    return {
      id: r.id,
      userId: r.user_id,
      content: r.content,
      userName: profile?.name ?? 'Usuário',
      userAvatar: profile?.avatar_url ?? null,
      createdAt: r.created_at,
    };
  });
};

export const updateCommunityPostComment = async (commentId: string, content: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('community_post_comments')
    .update({ content: content.trim() })
    .eq('id', commentId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteCommunityPostComment = async (commentId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.from('community_post_comments').delete().eq('id', commentId);
  if (error) throw error;
};

export const createCommunityPostComment = async (postId: string, userId: string, content: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('community_post_comments')
    .insert({ post_id: postId, user_id: userId, content: content.trim() })
    .select()
    .single();
  if (error) throw error;
  const { data: post } = await supabaseClient.from('community_posts').select('user_id').eq('id', postId).single();
  if (post?.user_id && post.user_id !== userId) {
    try {
      await createNotification({
        user_id: post.user_id,
        type: 'announcement',
        title: 'Novo comentário na comunidade',
        message: 'Alguém comentou no seu post. Toque para ver.',
        action_url: 'community',
      });
    } catch (_) {}
  }
  return data;
};

// Group Studies (Estudos em grupo)
export interface GroupStudy {
  id: string;
  user_id: string;
  title: string;
  theme: string;
  book_reference: string | null;
  description: string | null;
  created_at: string;
  authorName?: string;
  authorAvatar?: string | null;
  commentsCount?: number;
  participantsCount?: number;
  topicsCount?: number;
}

export interface GroupStudyComment {
  id: string;
  userId: string;
  content: string;
  userName: string;
  userAvatar?: string | null;
  createdAt: string;
}

export interface GroupStudyParticipant {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  joinedAt: string;
}

export interface GroupStudyTopic {
  id: string;
  studyId: string;
  userId: string;
  title: string;
  content: string | null;
  createdAt: string;
  authorName: string;
  authorAvatar?: string | null;
  repliesCount: number;
  replies?: GroupStudyTopicReply[];
}

export interface GroupStudyTopicReply {
  id: string;
  topicId: string;
  userId: string;
  content: string;
  createdAt: string;
  userName: string;
  userAvatar?: string | null;
}

export const getGroupStudies = async (limit = 50) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data: studies, error } = await supabaseClient
    .from('group_studies')
    .select('id, user_id, title, theme, book_reference, description, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    if ((error as any)?.code === '42P01') return []; // tabela não existe
    throw error;
  }
  const list: GroupStudy[] = (studies ?? []).map((s: any) => ({
    id: s.id,
    user_id: s.user_id,
    title: s.title,
    theme: s.theme,
    book_reference: s.book_reference ?? null,
    description: s.description ?? null,
    created_at: s.created_at,
    authorName: 'Usuário',
    commentsCount: 0,
  }));
  const userIds = [...new Set(list.map((s) => s.user_id))];
  if (userIds.length > 0) {
    const { data: users } = await supabaseClient.from('users').select('id, name, avatar_url').in('id', userIds);
    const userMap = (users ?? []).reduce((acc: Record<string, any>, u: any) => {
      acc[u.id] = u;
      return acc;
    }, {});
    list.forEach((s) => {
      s.authorName = userMap[s.user_id]?.name ?? 'Usuário';
      s.authorAvatar = userMap[s.user_id]?.avatar_url ?? null;
    });
  }
  for (const study of list) {
    try {
      const [pcRes, tcRes] = await Promise.all([
        supabaseClient.from('group_study_participants').select('id', { count: 'exact', head: true }).eq('study_id', study.id),
        supabaseClient.from('group_study_topics').select('id', { count: 'exact', head: true }).eq('study_id', study.id),
      ]);
      study.participantsCount = (pcRes?.count ?? 0) || 0;
      study.topicsCount = (tcRes?.count ?? 0) || 0;
    } catch (_) {
      study.participantsCount = 0;
      study.topicsCount = 0;
    }
  }
  return list;
};

export const getGroupStudyById = async (id: string): Promise<GroupStudy | null> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('group_studies')
    .select('id, user_id, title, theme, book_reference, description, created_at')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  const s = data as any;
  const { data: user } = await supabaseClient.from('users').select('name, avatar_url').eq('id', s.user_id).single();
  let participantsCount = 0;
  let topicsCount = 0;
  try {
    const [pcRes, tcRes] = await Promise.all([
      supabaseClient.from('group_study_participants').select('id', { count: 'exact', head: true }).eq('study_id', id),
      supabaseClient.from('group_study_topics').select('id', { count: 'exact', head: true }).eq('study_id', id),
    ]);
    participantsCount = (pcRes?.count ?? 0) || 0;
    topicsCount = (tcRes?.count ?? 0) || 0;
  } catch (_) {}
  return {
    id: s.id,
    user_id: s.user_id,
    title: s.title,
    theme: s.theme,
    book_reference: s.book_reference ?? null,
    description: s.description ?? null,
    created_at: s.created_at,
    authorName: (user as any)?.name ?? 'Usuário',
    authorAvatar: (user as any)?.avatar_url ?? null,
    participantsCount,
    topicsCount,
  };
};

export const createGroupStudy = async (study: {
  user_id: string;
  title: string;
  theme: string;
  book_reference?: string | null;
  description?: string | null;
}) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('group_studies')
    .insert({
      user_id: study.user_id,
      title: study.title.trim(),
      theme: study.theme.trim(),
      book_reference: study.book_reference?.trim() || null,
      description: study.description?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getGroupStudyComments = async (studyId: string): Promise<GroupStudyComment[]> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data: rows, error } = await supabaseClient
    .from('group_study_comments')
    .select('id, user_id, content, created_at')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true });
  if (error) return [];
  if (!rows?.length) return [];
  const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))] as string[];
  const { data: users } = await supabaseClient.from('users').select('id, name, avatar_url').in('id', userIds);
  const userMap = (users ?? []).reduce((acc: Record<string, any>, u: any) => {
    acc[u.id] = u;
    return acc;
  }, {});
  return rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    content: r.content,
    userName: userMap[r.user_id]?.name ?? 'Usuário',
    userAvatar: userMap[r.user_id]?.avatar_url ?? null,
    createdAt: r.created_at,
  }));
};

export const createGroupStudyComment = async (studyId: string, userId: string, content: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('group_study_comments')
    .insert({ study_id: studyId, user_id: userId, content: content.trim() })
    .select()
    .single();
  if (error) throw error;
  const { data: study } = await supabaseClient.from('group_studies').select('user_id').eq('id', studyId).single();
  if (study?.user_id && study.user_id !== userId) {
    try {
      await createNotification({
        user_id: study.user_id,
        type: 'announcement',
        title: 'Novo comentário no estudo',
        message: 'Alguém comentou no seu estudo em grupo. Toque para ver.',
        action_url: 'group_study:' + studyId,
      });
    } catch (_) {}
  }
  return data;
};

/** Verifica se o usuário é participante do estudo */
export const isGroupStudyParticipant = async (studyId: string, userId: string): Promise<boolean> => {
  if (!supabaseClient) return false;
  const { count, error } = await supabaseClient
    .from('group_study_participants')
    .select('id', { count: 'exact', head: true })
    .eq('study_id', studyId)
    .eq('user_id', userId);
  if (error) return false;
  return (count ?? 0) > 0;
};

/** Participa do estudo (com confirmação feita no cliente) */
export const joinGroupStudy = async (studyId: string, userId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('group_study_participants')
    .insert({ study_id: studyId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

/** Sai do estudo */
export const leaveGroupStudy = async (studyId: string, userId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient
    .from('group_study_participants')
    .delete()
    .eq('study_id', studyId)
    .eq('user_id', userId);
  if (error) throw error;
};

/** Lista participantes do estudo */
export const getGroupStudyParticipants = async (studyId: string): Promise<GroupStudyParticipant[]> => {
  if (!supabaseClient) return [];
  const { data: rows, error } = await supabaseClient
    .from('group_study_participants')
    .select('id, user_id, joined_at')
    .eq('study_id', studyId)
    .order('joined_at', { ascending: true });
  if (error || !rows?.length) return [];
  const userIds = [...new Set(rows.map((r: any) => r.user_id))];
  const { data: users } = await supabaseClient.from('users').select('id, name, avatar_url').in('id', userIds);
  const userMap = (users ?? []).reduce((acc: Record<string, any>, u: any) => {
    acc[u.id] = u;
    return acc;
  }, {});
  return rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    userName: userMap[r.user_id]?.name ?? 'Usuário',
    userAvatar: userMap[r.user_id]?.avatar_url ?? null,
    joinedAt: r.joined_at,
  }));
};

/** Lista tópicos do estudo */
export const getGroupStudyTopics = async (studyId: string): Promise<GroupStudyTopic[]> => {
  if (!supabaseClient) return [];
  const { data: topics, error } = await supabaseClient
    .from('group_study_topics')
    .select('id, study_id, user_id, title, content, created_at')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false });
  if (error || !topics?.length) return [];
  const userIds = [...new Set(topics.map((t: any) => t.user_id))];
  const { data: users } = await supabaseClient.from('users').select('id, name, avatar_url').in('id', userIds);
  const userMap = (users ?? []).reduce((acc: Record<string, any>, u: any) => {
    acc[u.id] = u;
    return acc;
  }, {});
  const result: GroupStudyTopic[] = topics.map((t: any) => ({
    id: t.id,
    studyId: t.study_id,
    userId: t.user_id,
    title: t.title,
    content: t.content ?? null,
    createdAt: t.created_at,
    authorName: userMap[t.user_id]?.name ?? 'Usuário',
    authorAvatar: userMap[t.user_id]?.avatar_url ?? null,
    repliesCount: 0,
  }));
  for (const topic of result) {
    const { count } = await supabaseClient.from('group_study_topic_replies').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id);
    topic.repliesCount = count ?? 0;
  }
  return result;
};

/** Cria tópico (apenas o criador do estudo) */
export const createGroupStudyTopic = async (studyId: string, userId: string, title: string, content?: string | null) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data: study } = await supabaseClient.from('group_studies').select('user_id').eq('id', studyId).single();
  if (!study?.user_id) throw new Error('Estudo não encontrado.');
  if (study.user_id !== userId) throw new Error('Apenas o criador do estudo pode criar tópicos.');
  const { data, error } = await supabaseClient
    .from('group_study_topics')
    .insert({
      study_id: studyId,
      user_id: userId,
      title: title.trim(),
      content: content?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

/** Lista respostas de um tópico */
export const getGroupStudyTopicReplies = async (topicId: string): Promise<GroupStudyTopicReply[]> => {
  if (!supabaseClient) return [];
  const { data: rows, error } = await supabaseClient
    .from('group_study_topic_replies')
    .select('id, topic_id, user_id, content, created_at')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true });
  if (error || !rows?.length) return [];
  const userIds = [...new Set(rows.map((r: any) => r.user_id))];
  const { data: users } = await supabaseClient.from('users').select('id, name, avatar_url').in('id', userIds);
  const userMap = (users ?? []).reduce((acc: Record<string, any>, u: any) => {
    acc[u.id] = u;
    return acc;
  }, {});
  return rows.map((r: any) => ({
    id: r.id,
    topicId: r.topic_id,
    userId: r.user_id,
    content: r.content,
    createdAt: r.created_at,
    userName: userMap[r.user_id]?.name ?? 'Usuário',
    userAvatar: userMap[r.user_id]?.avatar_url ?? null,
  }));
};

/** Responde a um tópico (apenas participantes) */
export const createGroupStudyTopicReply = async (topicId: string, userId: string, content: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data: topic } = await supabaseClient.from('group_study_topics').select('study_id').eq('id', topicId).single();
  if (!topic?.study_id) throw new Error('Tópico não encontrado.');
  const isPart = await isGroupStudyParticipant(topic.study_id, userId);
  if (!isPart) throw new Error('Apenas participantes podem responder.');
  const { data, error } = await supabaseClient
    .from('group_study_topic_replies')
    .insert({ topic_id: topicId, user_id: userId, content: content.trim() })
    .select()
    .single();
  if (error) throw error;
  const { data: topicRow } = await supabaseClient.from('group_study_topics').select('user_id').eq('id', topicId).single();
  if (topicRow?.user_id && topicRow.user_id !== userId) {
    try {
      await createNotification({
        user_id: topicRow.user_id,
        type: 'announcement',
        title: 'Nova resposta no tópico',
        message: 'Alguém respondeu no tópico do estudo em grupo.',
        action_url: 'group_study:' + topic.study_id,
      });
    } catch (_) {}
  }
  return data;
};

/**
 * Retorna o evento marcado para o dia/horário atual (para vincular presença ao escanear QR sem eventId).
 * Considera eventos de hoje; escolhe o que já começou e está mais próximo do horário atual, ou o próximo do dia.
 */
export const getEventForCurrentTime = async (): Promise<{ id: string; title: string } | null> => {
  if (!supabaseClient) return null;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const localToday = `${year}-${month}-${day}`;

  const { data: events, error } = await supabaseClient
    .from('events')
    .select('id, title, date, time')
    .eq('date', localToday)
    .order('time', { ascending: true });

  if (error || !events?.length) return null;

  type Ev = { id: string; title: string; date: string; time: string };
  let chosen: Ev | null = null;
  for (const ev of events as Ev[]) {
    const timePart = (ev.time || '00:00').trim().slice(0, 5);
    const [h = 0, m = 0] = timePart.split(':').map(Number);
    const eventStart = new Date(year, now.getMonth(), now.getDate(), h, m, 0);
    if (eventStart <= now) {
      chosen = ev;
    } else {
      break;
    }
  }
  if (!chosen) chosen = events[0] as Ev;
  return chosen ? { id: chosen.id, title: chosen.title } : null;
};

// Attendance Queries
export const createAttendanceRecord = async (record: Database['public']['Tables']['attendance_records']['Insert']) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');

  let eventTitle: string | null = null;
  let eventDate: string | null = null;

  if (record.event_id) {
    const { data: existing } = await supabaseClient
      .from('attendance_records')
      .select('id')
      .eq('user_id', record.user_id)
      .eq('event_id', record.event_id)
      .maybeSingle();
    if (existing) {
      const { data: ev } = await supabaseClient.from('events').select('title').eq('id', record.event_id).maybeSingle();
      const title = (ev as { title?: string } | null)?.title ?? 'este evento';
      throw new Error(`Presença já registrada para ${title}.`);
    }
    const { data: ev } = await supabaseClient.from('events').select('title, date').eq('id', record.event_id).maybeSingle();
    if (ev) {
      eventTitle = (ev as { title?: string }).title ?? null;
      eventDate = (ev as { date?: string }).date ?? null;
    }
  }

  const payload = {
    ...record,
    event_title_snapshot: eventTitle ?? record.event_title_snapshot ?? null,
    event_date_snapshot: eventDate ?? record.event_date_snapshot ?? null,
  };

  const { data, error } = await supabaseClient
    .from('attendance_records')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  if (data?.user_id && data?.event_id) {
    const { data: ev } = await supabaseClient.from('events').select('title').eq('id', data.event_id).single();
    const eventTitle = (ev as any)?.title ?? 'evento';
    try {
      await createNotification({
        user_id: data.user_id,
        type: 'event',
        title: 'Presença registrada',
        message: `Sua presença no evento "${eventTitle}" foi registrada!`,
        action_url: 'event:' + data.event_id,
      });
    } catch (_) {}
  }
  return data;
};

export const getAttendanceRecords = async (eventId?: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  let query = supabaseClient
    .from('attendance_records')
    .select('*, users(name, avatar_url), events(title, date)')
    .order('check_in_time', { ascending: false });

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

/** Remove um registro de presença (admin). Presenças são dados históricos; use com confirmação. */
export const deleteAttendanceRecord = async (recordId: string): Promise<void> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.from('attendance_records').delete().eq('id', recordId);
  if (error) throw error;
};

// ========== Visitantes (presença sem conta) ==========

/** Registra presença de visitante (Modo 1 ou 2). Pode ser anônimo ou vinculado a visitor_profile. */
export const createVisitorPresence = async (params: {
  eventId: string;
  name?: string;
  isFirstTime?: boolean;
  contactOptIn?: boolean;
  visitorProfileId?: string;
}) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('event_visitors')
    .insert({
      event_id: params.eventId,
      visitor_profile_id: params.visitorProfileId || null,
      name: params.name?.trim() || null,
      is_first_time: params.isFirstTime ?? true,
      contact_opt_in: params.contactOptIn ?? false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

/** Busca visitantes de um evento */
export const getEventVisitors = async (eventId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('event_visitors')
    .select('*, visitor_profiles(name, visit_count)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

/** Cria ou atualiza visitor_profile (Modo 2). Retorna o perfil com qr_code_token. */
export const createOrGetVisitorProfile = async (name: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const token = `vp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const { data, error } = await supabaseClient
    .from('visitor_profiles')
    .insert({ name: name.trim(), qr_code_token: token, visit_count: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
};

/** Busca visitor_profile pelo qr_code_token (para Fluxo A: responsável escaneia QR do visitante) */
export const getVisitorProfileByToken = async (token: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('visitor_profiles')
    .select('*')
    .eq('qr_code_token', token)
    .maybeSingle();
  if (error) throw error;
  return data;
};

/** Lista todos os visitantes (event_visitors) com evento e perfil. Para admin. */
export const getAllEventVisitors = async (eventId?: string, limit = 200) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  let query = supabaseClient
    .from('event_visitors')
    .select('*, events(id, title, date), visitor_profiles(name, visit_count)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (eventId) query = query.eq('event_id', eventId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};

/** Remove registro de visitante (admin). */
export const deleteEventVisitor = async (id: string): Promise<void> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.from('event_visitors').delete().eq('id', id);
  if (error) throw error;
};

// --- Ministérios (tarefas, foco mensal, membros, propósito) ---
export const getMinistryPurposeFromDb = async (ministryKey: string): Promise<string | null> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('ministry_purposes')
    .select('purpose')
    .eq('ministry_key', ministryKey)
    .maybeSingle();
  if (error) throw error;
  return data?.purpose?.trim() ? data.purpose : null;
};

export const upsertMinistryPurpose = async (ministryKey: string, purpose: string, userId?: string | null) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('ministry_purposes')
    .upsert(
      { ministry_key: ministryKey, purpose: purpose.trim(), updated_at: new Date().toISOString(), updated_by: userId ?? null },
      { onConflict: 'ministry_key' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getMinistryTasks = async (ministryKey: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('ministry_tasks')
    .select('*')
    .eq('ministry_key', ministryKey)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export const insertMinistryTask = async (params: {
  ministry_key: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  task_type?: string | null;
  frequency?: string | null;
  priority?: string | null;
  responsible_user_id?: string | null;
  support_user_id?: string | null;
  status?: string;
  created_by?: string | null;
}) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.from('ministry_tasks').insert(params).select().single();
  if (error) throw error;
  return data;
};

export const updateMinistryTask = async (id: string, updates: {
  title?: string;
  description?: string | null;
  due_date?: string | null;
  is_done?: boolean;
  task_type?: string | null;
  frequency?: string | null;
  priority?: string | null;
  responsible_user_id?: string | null;
  support_user_id?: string | null;
  status?: string;
}) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const u = { ...updates };
  if (u.is_done === true) u.status = 'concluida';
  if (u.is_done === false) u.status = 'pendente';
  const { data, error } = await supabaseClient.from('ministry_tasks').update(u).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteMinistryTask = async (id: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.from('ministry_tasks').delete().eq('id', id);
  if (error) throw error;
}

/** Foco do mês: um registro por ministério/ano/mês. */
export const getMinistryMonthlyFocus = async (ministryKey: string, year: number, month: number) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('ministry_monthly_focus')
    .select('*')
    .eq('ministry_key', ministryKey)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const upsertMinistryMonthlyFocus = async (params: {
  ministry_key: string;
  month: number;
  year: number;
  theme: string;
  objective?: string | null;
  base_verse?: string | null;
  practical_direction?: string | null;
  notes?: string | null;
  created_by?: string | null;
}) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('ministry_monthly_focus')
    .upsert(
      { ...params, updated_at: new Date().toISOString() },
      { onConflict: 'ministry_key,year,month' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
};

// --- Agenda mensal (programações por data) ---
export const getMinistryCalendarEvents = async (ministryKey: string, year: number, month: number) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const { data, error } = await supabaseClient
    .from('ministry_calendar_events')
    .select('*')
    .eq('ministry_key', ministryKey)
    .gte('event_date', startDate)
    .lte('event_date', endDate)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true });
  if (error) throw error;
  return data ?? [];
};

export const insertMinistryCalendarEvent = async (params: {
  ministry_key: string;
  event_date: string;
  title: string;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  schedule_type?: string | null;
  created_by?: string | null;
}) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.from('ministry_calendar_events').insert(params).select().single();
  if (error) throw error;
  return data;
};

export const updateMinistryCalendarEvent = async (id: string, updates: {
  event_date?: string;
  title?: string;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  schedule_type?: string | null;
}) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.from('ministry_calendar_events').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteMinistryCalendarEvent = async (id: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.from('ministry_calendar_events').delete().eq('id', id);
  if (error) throw error;
};

/** Retorna contagem de membros por ministry_key (para listagens). */
export const getMinistryMemberCounts = async (): Promise<Record<string, number>> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('ministry_members')
    .select('ministry_key');
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: { ministry_key: string }) => {
    counts[r.ministry_key] = (counts[r.ministry_key] ?? 0) + 1;
  });
  return counts;
};

/** Próximos eventos por ministry_key (event_date >= hoje, ordenado por data, limit por ministério). */
export const getUpcomingMinistryEventsByKey = async (
  limitPerMinistry = 2
): Promise<Record<string, { event_date: string; title: string }[]>> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseClient
    .from('ministry_calendar_events')
    .select('ministry_key, event_date, title')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(100);
  if (error) throw error;
  const byKey: Record<string, { event_date: string; title: string }[]> = {};
  (data ?? []).forEach((r: { ministry_key: string; event_date: string; title: string }) => {
    if (!byKey[r.ministry_key]) byKey[r.ministry_key] = [];
    if (byKey[r.ministry_key].length < limitPerMinistry) {
      byKey[r.ministry_key].push({ event_date: r.event_date, title: r.title });
    }
  });
  return byKey;
};

// --- Cronograma do evento ---
export const getMinistryEventSchedule = async (eventId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
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
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('ministry_event_schedule')
    .upsert(params, { onConflict: 'event_id,step_type' })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteMinistryEventScheduleItem = async (eventId: string, stepType: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.from('ministry_event_schedule').delete().eq('event_id', eventId).eq('step_type', stepType);
  if (error) throw error;
};

export const getMinistryAgenda = async (ministryKey: string, year: number, month: number) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('ministry_agenda')
    .select('*')
    .eq('ministry_key', ministryKey)
    .eq('year', year)
    .eq('month', month)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
};

export const insertMinistryAgendaItem = async (params: {
  ministry_key: string;
  month: number;
  year: number;
  title: string;
  notes?: string | null;
  created_by?: string | null;
}) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.from('ministry_agenda').insert(params).select().single();
  if (error) throw error;
  return data;
};

export const deleteMinistryAgendaItem = async (id: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.from('ministry_agenda').delete().eq('id', id);
  if (error) throw error;
};

export const getMinistryMembers = async (ministryKey: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data: rows, error } = await supabaseClient
    .from('ministry_members')
    .select('id, user_id, role, function, involvement_level, entry_date, private_note, created_at')
    .eq('ministry_key', ministryKey)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const list = rows ?? [];
  if (list.length === 0) return [];
  const userIds = [...new Set(list.map((r: any) => r.user_id).filter(Boolean))];
  const { data: usersData } = await supabaseClient.from('users').select('id, name, avatar_url').in('id', userIds);
  const userMap = (usersData ?? []).reduce((acc: Record<string, { name: string; avatar_url: string | null }>, u: any) => {
    acc[u.id] = { name: u.name ?? 'Usuário', avatar_url: u.avatar_url ?? null };
    return acc;
  }, {});
  return list.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    role: r.role,
    function: r.function ?? null,
    involvementLevel: r.involvement_level ?? null,
    entryDate: r.entry_date ?? null,
    privateNote: r.private_note ?? null,
    createdAt: r.created_at,
    name: userMap[r.user_id]?.name ?? 'Usuário',
    avatarUrl: userMap[r.user_id]?.avatar_url ?? null,
  }));
};

export const addMinistryMember = async (ministryKey: string, userId: string, opts?: {
  role?: string | null;
  function?: string | null;
  involvement_level?: string | null;
  entry_date?: string | null;
}) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('ministry_members')
    .insert({
      ministry_key: ministryKey,
      user_id: userId,
      role: opts?.role ?? null,
      function: opts?.function ?? null,
      involvement_level: opts?.involvement_level ?? null,
      entry_date: opts?.entry_date ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateMinistryMember = async (id: string, updates: {
  role?: string | null;
  function?: string | null;
  involvement_level?: string | null;
  entry_date?: string | null;
  private_note?: string | null;
}) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.from('ministry_members').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const removeMinistryMember = async (id: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.from('ministry_members').delete().eq('id', id);
  if (error) throw error;
};

/** Inscrições em eventos (formulário), com status de pagamento */
export const getEventRegistrations = async (eventId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

/** Marcar inscrição como paga ou pendente */
export const updateRegistrationPaymentStatus = async (registrationId: string, paid: boolean) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('event_registrations')
    .update({ payment_status: paid ? 'paid' : 'pending' })
    .eq('id', registrationId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Notification Queries
export const getNotifications = async (userId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const markNotificationRead = async (notificationId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/** Apaga todas as notificações do usuário (só as dele; não afeta outros usuários). */
export const deleteAllNotificationsForUser = async (userId: string): Promise<number> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .select('id');

  if (error) throw error;
  return Array.isArray(data) ? data.length : 0;
};

export type NotificationInsert = {
  user_id: string;
  type: 'event' | 'prayer' | 'achievement' | 'announcement' | 'reminder';
  title: string;
  message: string;
  is_read?: boolean;
  action_url?: string | null;
};

/** Cria uma notificação para um usuário (via RPC SECURITY DEFINER, contorna RLS). */
export const createNotification = async (notification: NotificationInsert) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data: id, error } = await supabaseClient.rpc('create_notification_for_user', {
    p_user_id: notification.user_id,
    p_type: notification.type,
    p_title: notification.title,
    p_message: notification.message,
    p_action_url: notification.action_url ?? null,
    p_is_read: notification.is_read ?? false,
  });
  if (error) throw error;
  return {
    id,
    user_id: notification.user_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    is_read: notification.is_read ?? false,
    action_url: notification.action_url ?? null,
    created_at: new Date().toISOString(),
  };
};

/** Envia a mesma notificação para vários usuários (ex.: aviso geral). Usa RPC para contornar RLS. */
export const createNotificationForUsers = async (userIds: string[], notification: Omit<NotificationInsert, 'user_id'>) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const results = await Promise.all(
    userIds.map((user_id) => createNotification({ ...notification, user_id, is_read: false }))
  );
  return results;
};

/** Envia notificação para todos os usuários com um role (ex.: 'user'). Retorna quantidade de notificações criadas. */
export const notifyUsersWithRole = async (params: {
  role: string;
  type: string;
  title: string;
  message: string;
  action_url?: string | null;
}): Promise<number> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.rpc('notify_users_with_role', {
    p_role: params.role,
    p_type: params.type,
    p_title: params.title,
    p_message: params.message,
    p_action_url: params.action_url ?? null,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
};

// Announcement Queries
export const getAnnouncements = async () => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('announcements')
    .select('*, users(name)')
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createAnnouncement = async (announcement: Database['public']['Tables']['announcements']['Insert']) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('announcements')
    .insert(announcement)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateAnnouncement = async (id: string, updates: Database['public']['Tables']['announcements']['Update']) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteAnnouncement = async (id: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('announcements')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Verse of Week — lê o mesmo valor definido em admin Versículos (app_settings.verse_of_the_week)
export const getCurrentVerseOfWeek = async (): Promise<{ reference: string; verse: string } | null> => {
  try {
    const raw = await getAppSetting('verse_of_the_week');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ref?: string; text?: string };
    if (parsed.ref && parsed.text) return { reference: parsed.ref, verse: parsed.text };
    return null;
  } catch (_) {
    return null;
  }
};

// Analytics Queries
export const getAnalytics = async () => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { count: totalYouth } = await supabaseClient.from('users').select('*', { count: 'exact', head: true });
  const { count: activeYouth } = await supabaseClient.from('users').select('*', { count: 'exact', head: true }).gte('last_active', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  const { count: prayerRequests } = await supabaseClient.from('prayer_requests').select('*', { count: 'exact', head: true });
  const { count: answeredPrayers } = await supabaseClient.from('prayer_requests').select('*', { count: 'exact', head: true }).eq('is_answered', true);
  const { count: upcomingEvents } = await supabaseClient.from('events').select('*', { count: 'exact', head: true }).gte('date', new Date().toISOString().split('T')[0]);

  return {
    totalYouth: totalYouth || 0,
    activeYouth: activeYouth || 0,
    prayerRequests: prayerRequests || 0,
    answeredPrayers: answeredPrayers || 0,
    upcomingEvents: upcomingEvents || 0,
  };
};

/** Métricas completas para o painel admin: dados reais do Supabase */
export const getAdminAnalytics = async (): Promise<{
  totalYouth: number;
  activeYouth: number;
  averageAttendance: number;
  devotionalCompletion: number;
  prayerRequests: number;
  answeredPrayers: number;
  upcomingEvents: number;
  weeklyGrowth: number;
  monthlyTrends: { month: string; attendance: number; devotionals: number; prayers: number }[];
}> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString();
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    allUsersRes,
    youthIdsRes,
    activeByLastActiveRes,
    attendanceRes,
    xpEventsRes,
    prayerRes,
    answeredRes,
    upcomingRes,
    devotionalsThisWeekRes,
    attendanceThisWeekRes,
    attendanceLastWeekRes,
  ] = await Promise.all([
    supabaseClient.from('users').select('id'),
    supabaseClient.from('users').select('id').neq('role', 'admin'),
    supabaseClient.from('users').select('id').neq('role', 'admin').gte('last_active', thirtyDaysAgo),
    supabaseClient.from('attendance_records').select('id, user_id, event_id, check_in_time'),
    supabaseClient.from('spiritual_xp_events').select('user_id, action_type, created_at'),
    supabaseClient.from('prayer_requests').select('id', { count: 'exact', head: true }),
    supabaseClient.from('prayer_requests').select('id', { count: 'exact', head: true }).eq('is_answered', true),
    supabaseClient.from('events').select('id', { count: 'exact', head: true }).gte('date', now.toISOString().split('T')[0]),
    supabaseClient.from('spiritual_xp_events').select('user_id').eq('action_type', 'devotional').gte('created_at', weekStartStr),
    supabaseClient.from('attendance_records').select('id').gte('check_in_time', weekStartStr),
    supabaseClient.from('attendance_records').select('id').gte('check_in_time', lastWeekStart).lt('check_in_time', weekStartStr),
  ]);

  const youthIds = new Set<string>((youthIdsRes.data ?? []).map((r: { id: string }) => r.id));
  const totalYouth = (allUsersRes.data ?? []).length;
  const attendanceList = attendanceRes.data ?? [];
  const xpList = xpEventsRes.data ?? [];
  const activeUserIds = new Set<string>();
  (activeByLastActiveRes.data ?? []).forEach((u: any) => activeUserIds.add(u.id));
  attendanceList.forEach((r: any) => r.check_in_time >= thirtyDaysAgo && youthIds.has(r.user_id) && activeUserIds.add(r.user_id));
  xpList.forEach((e: any) => e.created_at >= thirtyDaysAgo && youthIds.has(e.user_id) && activeUserIds.add(e.user_id));
  const activeYouth = activeUserIds.size;

  const eventIds = [...new Set(attendanceList.map((r: any) => r.event_id).filter(Boolean))];
  const totalAttendance = attendanceList.length;
  const averageAttendance = eventIds.length > 0 ? Math.round(totalAttendance / eventIds.length) : 0;

  const distinctDevotionalUsers = new Set((devotionalsThisWeekRes.data ?? []).map((r: any) => r.user_id)).size;
  const devotionalCompletion = totalYouth > 0 ? Math.min(100, Math.round((distinctDevotionalUsers / totalYouth) * 100)) : 0;

  const prayerRequests = prayerRes.count ?? 0;
  const answeredPrayers = answeredRes.count ?? 0;
  const upcomingEvents = upcomingRes.count ?? 0;

  const thisWeekCount = (attendanceThisWeekRes.data ?? []).length;
  const lastWeekCount = (attendanceLastWeekRes.data ?? []).length;
  const weeklyGrowth = lastWeekCount > 0 ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100) : (thisWeekCount > 0 ? 100 : 0);

  const monthlyTrends: { month: string; attendance: number; devotionals: number; prayers: number }[] = [];
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.toISOString().slice(0, 7) + '-01T00:00:00.000Z';
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const [attTrend, devTrend, prayTrend] = await Promise.all([
      supabaseClient.from('attendance_records').select('id', { count: 'exact', head: true }).gte('check_in_time', start).lte('check_in_time', end),
      supabaseClient.from('spiritual_xp_events').select('id', { count: 'exact', head: true }).eq('action_type', 'devotional').gte('created_at', start).lte('created_at', end),
      supabaseClient.from('prayer_requests').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
    ]);
    monthlyTrends.push({
      month: monthNames[d.getMonth()],
      attendance: attTrend.count ?? 0,
      devotionals: devTrend.count ?? 0,
      prayers: prayTrend.count ?? 0,
    });
  }

  return {
    totalYouth,
    activeYouth,
    averageAttendance,
    devotionalCompletion,
    prayerRequests,
    answeredPrayers,
    upcomingEvents,
    weeklyGrowth,
    monthlyTrends,
  };
};

/** Lista usuários que concluíram devocionais no período com quantidade (para tela admin). Usa RPC SECURITY DEFINER para contornar RLS. */
export const getDevotionalCompletionsUsers = async (daysBack: number = 30): Promise<{ id: string; name: string; avatar_url: string | null; completions_count: number }[]> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.rpc('get_devotional_completions_list', { days_back: daysBack });
  if (error) {
    console.error('getDevotionalCompletionsUsers', error);
    return [];
  }
  return (data ?? []).map((row: { id: string; name: string | null; avatar_url: string | null; completions_count: number }) => ({
    id: row.id,
    name: row.name ?? 'Sem nome',
    avatar_url: row.avatar_url,
    completions_count: Number(row.completions_count) || 0,
  }));
};

/** Lista jovens ativos no período (last_active, presença ou XP). Para tela admin. Usa RPC SECURITY DEFINER. */
export const getActiveYouthList = async (daysBack: number = 30): Promise<{ id: string; name: string; avatar_url: string | null }[]> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.rpc('get_active_youth_list', { days_back: daysBack });
  if (error) {
    console.error('getActiveYouthList', error);
    return [];
  }
  return (data ?? []).map((row: { id: string; name: string | null; avatar_url: string | null }) => ({
    id: row.id,
    name: row.name ?? 'Sem nome',
    avatar_url: row.avatar_url,
  }));
};

/** App settings (key-value). Valor retornado como string. */
export const getAppSetting = async (key: string): Promise<string | null> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.from('app_settings').select('value').eq('key', key).maybeSingle();
  if (error) return null;
  return data?.value ?? null;
};

/** Salva ou atualiza um app setting. value será convertido para string. */
export const setAppSetting = async (key: string, value: string | number): Promise<void> => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const str = typeof value === 'number' ? String(value) : value;
  const { error } = await supabaseClient.from('app_settings').upsert({ key, value: str }, { onConflict: 'key' });
  if (error) throw error;
};

// Real-time Subscriptions
export const subscribeToAttendance = (callback: (payload: any) => void) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  return supabaseClient
    .channel('attendance_records')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_records' }, callback)
    .subscribe();
};

export const subscribeToNotifications = (userId: string, callback: (payload: any) => void) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  return supabaseClient
    .channel(`notifications:${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, callback)
    .subscribe();
};

export const subscribeToCommunityPosts = (callback: (payload: any) => void) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  return supabaseClient
    .channel('community_posts')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, callback)
    .subscribe();
};

export const subscribeToEventRSVPs = (eventId: string, callback: (payload: any) => void) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  return supabaseClient
    .channel(`event_rsvps:${eventId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_rsvps', filter: `event_id=eq.${eventId}` }, callback)
    .subscribe();
};