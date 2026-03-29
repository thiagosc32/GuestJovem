import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Easing,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen,
  Heart,
  TrendingUp,
  Bell,
  Megaphone,
  ChevronRight,
  Sparkles,
  Flame,
  Trophy,
  Search,
  User,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getCurrentUser, getNotifications, getCurrentVerseOfWeek, createNotification } from '../../services/supabase';
import { getJourneySummary } from '../../services/spiritualJourney';
import { getCompanionState } from '../../services/spiritualCompanion';
import ConstancyBar from '../../components/ConstancyBar';
import ConstancyLevelUpModal from '../../components/ConstancyLevelUpModal';
import SheepIllustration from '../../components/SheepIllustration';
import type { CompanionStateKey } from '../../constants/spiritualCompanion';
import { COMPANION_STATES, isConstancyStateBetter, getConstancyLevelUpContent, type ConstancyLevelUpContent } from '../../constants/spiritualCompanion';
import { getDevotionalCategoryLabel } from '../../constants/devotionalCategories';
import { Announcement } from '../../types/models'; // Certifica-te de ter o tipo Event se necessário
import Gradient from '../../components/ui/Gradient';
import ProgressCard from '../../components/ProgressCard';
import LevelDisclaimer from '../../components/LevelDisclaimer';
import AnnouncementCard from '../../components/AnnouncementCard';
import DrawerMenuButton from '../../components/navigation/DrawerMenuButton';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { DEFAULT_EVENT_IMAGE_URL } from '../../constants/images';
import { SPACING } from '../../constants/dimensions';
import { SHADOWS } from '../../constants/theme';
import { mockVerseOfWeek } from '../../data/mockData';
import { RootStackParamList } from '../../types/navigation';

const COMPANION_AVATAR_COLORS: Record<CompanionStateKey, string> = {
  strong: '#22C55E',
  weakening: '#EAB308',
  weak: '#F97316',
  bones: '#EF4444',
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function UserDashboard() {
  const theme = useAppTheme();
  const navigation = useNavigation<NavigationProp>();

  /* ===== Estados ===== */
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<{ name: string; userId?: string; avatarUrl?: string | null; devotionalStreak?: number; spiritualGrowthLevel?: number } | null>(null);
  const [verseOfWeek, setVerseOfWeek] = useState<{ verse: string; reference: string }>(mockVerseOfWeek);
  const [weeklyDevotionals, setWeeklyDevotionals] = useState<any[]>([]);
  const [attendanceDays, setAttendanceDays] = useState(0);
  const [companionState, setCompanionState] = useState<CompanionStateKey | null>(null);
  const [levelName, setLevelName] = useState('Ouvir');
  const [spiritualProgress, setSpiritualProgress] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showConstancyLevelUpModal, setShowConstancyLevelUpModal] = useState(false);
  const [constancyLevelUpContent, setConstancyLevelUpContent] = useState<ConstancyLevelUpContent | null>(null);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Bom dia';
    if (h >= 12 && h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  /* ===== Animações ===== */
  const headerTranslateY = useRef(new Animated.Value(-40)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const statsTranslateY = useRef(new Animated.Value(30)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Função para carregar tudo (Usuário, Avisos, Eventos, Versículo, Devocionais, Presenças, Notificações)
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      const user = await getCurrentUser();
      const userId = (user as any)?.id;
      if (user) {
        const u = user as { name?: string; id?: string; avatar_url?: string | null; devotional_streak?: number; spiritual_growth_level?: number };
        setCurrentUser({
          name: u.name ?? 'Jovem',
          userId: u.id,
          avatarUrl: u.avatar_url ?? null,
          devotionalStreak: u.devotional_streak ?? 0,
          spiritualGrowthLevel: u.spiritual_growth_level ?? 50,
        });
      } else {
        setCurrentUser(null);
      }

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const role = (user as { role?: string } | null)?.role;
      const tenantCid =
        user && role !== 'super_admin' ? (user as { church_id?: string | null }).church_id ?? null : null;

      let annQ = supabase.from('announcements').select('*').eq('is_active', true).order('priority', { ascending: true });
      let evQ = supabase
        .from('events')
        .select('*')
        .gte('date', now.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(3);
      let devQ = supabase.from('devotionals').select('*').gte('date', weekStartStr).order('date', { ascending: false }).limit(7);
      if (tenantCid) {
        annQ = annQ.eq('church_id', tenantCid);
        evQ = evQ.eq('church_id', tenantCid);
        devQ = devQ.eq('church_id', tenantCid);
      }

      let attendancePromise: Promise<{ count: number | null }> = Promise.resolve({ count: 0 });
      if (userId) {
        let attQ = supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('user_id', userId);
        if (tenantCid) attQ = attQ.eq('church_id', tenantCid);
        attendancePromise = attQ;
      }

      const [
        announcementsRes,
        eventsRes,
        verseRes,
        devotionalsRes,
        attendanceRes,
        notificationsList,
      ] = await Promise.all([
        annQ,
        evQ,
        getCurrentVerseOfWeek().catch(() => null),
        devQ,
        attendancePromise,
        userId ? getNotifications(userId) : Promise.resolve([]),
      ]);

      if (announcementsRes.data) setAnnouncements(announcementsRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      if (verseRes && (verseRes as any).verse) setVerseOfWeek({ verse: (verseRes as any).verse, reference: (verseRes as any).reference });
      if (devotionalsRes.data) setWeeklyDevotionals(devotionalsRes.data);

      const days = attendanceRes?.count ?? 0;
      setAttendanceDays(days);

      if (userId) {
        try {
          const [journey, companion] = await Promise.all([
            getJourneySummary(userId),
            getCompanionState(userId),
          ]);
          if (journey) {
            setLevelName(journey.levelName);
            setSpiritualProgress(Math.round(journey.progressPercent));
          } else {
            setLevelName('Ouvir');
            setSpiritualProgress(0);
          }
          const newState = companion?.state ?? null;
          setCompanionState(newState);
          const storageKey = `constancy_state_${userId}`;
          try {
            const prevState = await AsyncStorage.getItem(storageKey) as CompanionStateKey | null;
            if (prevState !== null && newState && prevState !== newState) {
              if (isConstancyStateBetter(prevState, newState)) {
                const content = getConstancyLevelUpContent(newState, prevState);
                if (content) {
                  setConstancyLevelUpContent(content);
                  setShowConstancyLevelUpModal(true);
                }
              } else {
                await createNotification({
                  user_id: userId,
                  type: 'achievement',
                  title: 'Seu nível de constância mudou',
                  message: COMPANION_STATES[newState]?.message ?? 'Sua vida espiritual foi atualizada.',
                  action_url: 'journey',
                });
              }
            }
            await AsyncStorage.setItem(storageKey, newState ?? '');
          } catch (_) {}
        } catch (_) {
          setLevelName('Ouvir');
          setSpiritualProgress(0);
          setCompanionState(null);
        }
      } else {
        setLevelName('Ouvir');
        setSpiritualProgress(0);
        setCompanionState(null);
      }

      if (Array.isArray(notificationsList)) {
        const unread = notificationsList.filter((n: any) => !n.is_read).length;
        setUnreadNotifications(unread);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerTranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(statsTranslateY, { toValue: 0, duration: 600, delay: 200, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(statsOpacity, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();
  }, []);

  const ContentWrapper = Platform.OS === 'web' ? View : Animated.View;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" />

      <ContentWrapper style={[styles.container, { opacity: fadeAnim }]}>
        
        {/* HEADER */}
        <View style={styles.premiumHeader}>
          <Gradient colors={theme.headerSoftGradient} style={styles.headerBackgroundGradient} />
          <View style={styles.headerContentWrapper}>
            <Animated.View style={[styles.headerTop, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
              <DrawerMenuButton />
              <View style={styles.userProfile}>
                <View style={styles.avatarGlow}>
                  {currentUser?.avatarUrl ? (
                    <Image source={{ uri: currentUser.avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                  ) : (
                    <User size={20} color={COLORS.primary} />
                  )}
                </View>
                <View>
                  <Text style={styles.subtleGreeting}>{getGreeting()},</Text>
                  <Text style={styles.boldUserName}>{currentUser ? currentUser.name.split(' ')[0] : 'Jovem'}</Text>
                </View>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.actionCircle}
                  onPress={() => (navigation.getParent() as any)?.navigate('MainTabs', { screen: 'PrayerRequestScreen' })}
                  accessibilityLabel="Pedidos de oração"
                >
                  <Heart size={20} color={COLORS.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCircle} onPress={() => (navigation.getParent() as any)?.getParent()?.navigate('NotificationScreen')}>
                  <Bell size={20} color={COLORS.text} />
                  {unreadNotifications > 0 && <View style={styles.activeDot} />}
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Animated.View style={[styles.floatingStatsContainer, { opacity: statsOpacity, transform: [{ translateY: statsTranslateY }] }]}>
              <View style={styles.constancyRow}>
                {companionState ? (
                  <View style={[styles.constancyAvatarWrap, { backgroundColor: COMPANION_AVATAR_COLORS[companionState] + '22' }]}>
                    <SheepIllustration state={companionState} color={COMPANION_AVATAR_COLORS[companionState]} size={36} />
                  </View>
                ) : (
                  <View style={[styles.constancyAvatarWrap, { backgroundColor: COLORS.border }]}>
                    <Flame size={18} color={COLORS.textLight} />
                  </View>
                )}
                <View style={styles.constancyBarWrap}>
                  {companionState ? (
                    <ConstancyBar state={companionState} width={92} showLabel />
                  ) : (
                    <View style={styles.constancyBarPlaceholder}>
                      <Flame size={12} color={COLORS.textLight} />
                      <Text style={styles.constancyBarPlaceholderText}>Constância</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.statLineDivider} />
              <View style={styles.subtleStatBox}>
                <View style={[styles.iconCircleStat, { backgroundColor: '#E6F7ED' }]}><Trophy size={14} color={COLORS.secondary} /></View>
                <View><Text style={styles.statLabel}>Nível</Text><Text style={styles.statValue} numberOfLines={1}>{levelName}</Text></View>
              </View>
            </Animated.View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboardData(); }} />}
        >
          {/* AVISOS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Megaphone size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Avisos da Comunidade</Text>
              </View>
            </View>
            {isLoading ? <ActivityIndicator color={COLORS.primary} /> : 
              announcements.slice(0, 2).map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
          </View>

          {/* VERSÍCULO */}
          <View style={styles.section}>
            <Gradient colors={[theme.secondary, `${theme.secondary}CC`]} style={styles.verseCard}>
              <View style={styles.verseIconContainer}><BookOpen size={24} color="#fff" /></View>
              <Text style={styles.verseTitle}>Versículo da Semana</Text>
              <Text style={styles.verseReference}>{verseOfWeek.reference}</Text>
              <Text style={styles.verseText}>"{verseOfWeek.verse}"</Text>
            </Gradient>
          </View>

          {/* DEVOCIONAL DA SEMANA */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Devocional da Semana</Text>
              <View style={styles.premiumBadgeLabel}>
                <Sparkles size={12} color="#FFF" />
                <Text style={styles.premiumBadgeText}>SEMANA</Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.9} onPress={() => (navigation.getParent() as any)?.navigate('MainTabs', { screen: 'DevotionalScreen' })}>
              <View style={styles.newImageCard}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=2070&auto=format&fit=crop' }} style={StyleSheet.absoluteFillObject} />
                <Gradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.imageCardContent}>
                  <View style={styles.imageCardTop}><View style={styles.glassTag}><Text style={styles.glassTagText}>{getDevotionalCategoryLabel(weeklyDevotionals[0]?.category)}</Text></View></View>
                  <View style={styles.imageCardBottom}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.imageCardTitle}>{weeklyDevotionals[0]?.title || 'Devocionais da semana'}</Text>
                      <View style={styles.imageScriptureRow}>
                        <BookOpen size={14} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.imageCardScripture} numberOfLines={1}>{weeklyDevotionals[0]?.scripture || 'Toque para ver os devocionais'}</Text>
                      </View>
                    </View>
                    <View style={styles.imagePlayButton}><ChevronRight size={28} color="#FFF" /></View>
                  </View>
                </View>
                <View style={styles.imageProgressBarBg}><View style={[styles.imageProgressBarFill, { width: weeklyDevotionals.length > 0 ? `${Math.min(100, (weeklyDevotionals.length / 7) * 100)}%` : '0%' }]} /></View>
              </View>
            </TouchableOpacity>
          </View>

          {/* PRÓXIMOS EVENTOS (DINÂMICO SUPABASE) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sua Agenda</Text>
              <TouchableOpacity onPress={() => (navigation.getParent() as any)?.navigate('MainTabs', { screen: 'EventsScreen' })}>
                <Text style={styles.seeAllText}>Ver tudo</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : events.length > 0 ? (
              events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  activeOpacity={0.9}
                  onPress={() => (navigation.getParent() as any)?.getParent()?.navigate('EventDetails', { eventId: event.id })}
                  style={{ marginBottom: 12 }}
                >
                  <View style={styles.eventImageCard}>
                    <Image
                      source={{ uri: event.image_url || DEFAULT_EVENT_IMAGE_URL }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <Gradient
                      colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.3)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.eventCardContent}>
                      <View style={styles.eventDateBadge}>
                        <Text style={styles.eventDayText}>{event.date ? new Date(event.date).getDate() : '--'}</Text>
                        <Text style={styles.eventMonthText}>
                          {event.date ? new Date(event.date).toLocaleString('pt-BR', { month: 'short' }).toUpperCase() : 'MES'}
                        </Text>
                      </View>
                      <View style={styles.eventInfoContainer}>
                        <Text style={styles.eventTitleText} numberOfLines={1}>{event.title}</Text>
                        <View style={styles.eventLocationRow}>
                          <TrendingUp size={12} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.eventLocationText} numberOfLines={1}>{event.location || 'Templo Sede'}</Text>
                        </View>
                      </View>
                      <View style={styles.eventActionIcon}><ChevronRight size={20} color="#FFF" /></View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{textAlign: 'center', color: '#8E8E93', marginTop: 10}}>Nenhum evento próximo</Text>
            )}
          </View>

          {/* JORNADA ESPIRITUAL */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Jornada Espiritual</Text>
            <ProgressCard title={`Nível: ${levelName}`} progress={spiritualProgress} color={COLORS.primary} subtitle={spiritualProgress >= 100 ? 'Parabéns! Continue firme.' : 'Devocionais, oração, eventos e reflexões são passos nesta jornada. Toque em Jornada para ver mais.'} />
            <LevelDisclaimer />
          </View>

          {/* AÇÕES RÁPIDAS */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => (navigation.getParent() as any)?.navigate('MainTabs', { screen: 'PrayerRequestScreen' })}>
              <Heart size={24} color={COLORS.spiritualOrange} /><Text style={styles.actionButtonText}>Oração</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => (navigation.getParent() as any)?.navigate('MainTabs', { screen: 'CommunityWall' })}>
              <TrendingUp size={24} color={COLORS.success} /><Text style={styles.actionButtonText}>Comunidade</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ContentWrapper>
      <ConstancyLevelUpModal
        visible={showConstancyLevelUpModal}
        content={constancyLevelUpContent}
        onDismiss={() => {
          setShowConstancyLevelUpModal(false);
          setConstancyLevelUpContent(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  premiumHeader: { backgroundColor: '#FFF', paddingBottom: 25, position: 'relative' },
  headerBackgroundGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: '100%', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContentWrapper: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 10 : 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12 },
  userProfile: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarGlow: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', ...SHADOWS.small, borderWidth: 2, borderColor: '#F0F4FF' },
  avatarImage: { width: 46, height: 46, borderRadius: 23 },
  subtleGreeting: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  boldUserName: { fontSize: 22, fontWeight: '800', color: '#1C1C1E', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 10 },
  actionCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...SHADOWS.small },
  activeDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: '#FFF' },
  floatingStatsContainer: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 20, padding: 12, alignItems: 'center', justifyContent: 'space-around', ...SHADOWS.medium, elevation: 4 },
  subtleStatBox: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  iconCircleStat: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  statLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '500' },
  statLineDivider: { width: 1, height: 25, backgroundColor: '#E5E5EA' },
  constancyRow: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, gap: 0 },
  constancyAvatarWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  constancyBarWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minWidth: 0 },
  constancyBarPlaceholder: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  constancyBarPlaceholderText: { fontSize: 11, fontWeight: '600', color: COLORS.textLight },
  scrollContent: { padding: SPACING.LG },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  seeAllText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  verseCard: { borderRadius: 24, padding: 24, alignItems: 'center', ...SHADOWS.small },
  verseIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  verseTitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 1.5 },
  verseReference: { fontSize: 20, color: '#fff', fontWeight: 'bold', marginBottom: 10 },
  verseText: { fontSize: 15, color: '#fff', textAlign: 'center', fontStyle: 'italic', lineHeight: 24 },
  
  newImageCard: { height: 200, borderRadius: 24, overflow: 'hidden', backgroundColor: '#000', ...SHADOWS.medium },
  imageCardContent: { flex: 1, padding: 20, justifyContent: 'space-between' },
  imageCardTop: { flexDirection: 'row', justifyContent: 'flex-end' },
  glassTag: { backgroundColor: 'rgba(255, 255, 255, 0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  glassTagText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  imageCardBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 15 },
  imageCardTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 6 },
  imageScriptureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  imageCardScripture: { fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', fontWeight: '500' },
  imagePlayButton: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  imageProgressBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', width: '100%' },
  imageProgressBarFill: { height: '100%', backgroundColor: COLORS.primary },
  premiumBadgeLabel: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  premiumBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  eventImageCard: { height: 90, borderRadius: 20, overflow: 'hidden', backgroundColor: '#1C1C1E', ...SHADOWS.small },
  eventCardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  eventDateBadge: { width: 50, height: 55, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  eventDayText: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  eventMonthText: { fontSize: 10, fontWeight: '700', color: COLORS.primary, marginTop: -2 },
  eventInfoContainer: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  eventTitleText: { fontSize: 17, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  eventLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventLocationText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' },
  eventActionIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },

  quickActions: { flexDirection: 'row', gap: 16, marginTop: 10, marginBottom: 20 },
  actionButton: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, alignItems: 'center', ...SHADOWS.small },
  actionButtonText: { fontSize: 14, fontWeight: '700', marginTop: 10 },
});