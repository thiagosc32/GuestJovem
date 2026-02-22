import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please configure .env file.');
}

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

try {
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

export const supabase = supabaseClient!;

// Auth Helper Functions
export const signIn = async (email: string, password: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signUp = async (email: string, password: string, name: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) throw error;

  if (data.user) {
    const { error: profileError } = await supabaseClient.from('users').insert({
      id: data.user.id,
      email,
      name,
      role: 'user',
      created_at: new Date().toISOString(),
    });
    if (profileError) throw profileError;
  }

  return data;
};

export const signOut = async () => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  if (!supabaseClient) {
    console.warn('Supabase client not initialized, returning null user');
    return null;
  }
  
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
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
  return { hasPrayed: !!row.has_prayed, newCount: Number(row.new_count) ?? 0 };
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

/** Resposta da liderança em pedido privado (campo leadership_message, não testimony) */
export const markPrivatePrayerAnswered = async (requestId: string, leadershipMessage: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
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
  return data;
};

export const createEventRSVP = async (eventId: string, userId: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('event_rsvps')
    .insert({ event_id: eventId, user_id: userId, status: 'confirmed' })
    .select()
    .single();

  if (error) throw error;
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
  return data;
};

// Attendance Queries
export const createAttendanceRecord = async (record: Database['public']['Tables']['attendance_records']['Insert']) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const { data, error } = await supabaseClient
    .from('attendance_records')
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getAttendanceRecords = async (eventId?: string) => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  let query = supabaseClient
    .from('attendance_records')
    .select('*, users(name, avatar_url), events(title)')
    .order('check_in_time', { ascending: false });

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  const { data, error } = await query;
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
  return data;
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

// Verse of Week Query
export const getCurrentVerseOfWeek = async () => {
  if (!supabaseClient) throw new Error('Supabase client not initialized');
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabaseClient
    .from('verse_of_week')
    .select('*')
    .lte('week_start', today)
    .gte('week_end', today)
    .single();

  if (error) throw error;
  return data;
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