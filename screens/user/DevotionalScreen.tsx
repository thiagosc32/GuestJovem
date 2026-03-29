import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Platform, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, CheckCircle, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Progress from 'react-native-progress';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, globalStyles, SHADOWS } from '../../constants/theme';
import { getCurrentUser, getDevotionals, getTenantChurchIdForDataScope, supabase } from '../../services/supabase';
import { awardXp } from '../../services/spiritualJourney';
import { notifyAchievementUnlockIfNew } from '../../services/achievementsService';
import { getDevotionalCategoryLabel } from '../../constants/devotionalCategories';
import { Devotional } from '../../types/models';
import Gradient from '../../components/ui/Gradient';

function mapRowToDevotional(row: any, completedIds: string[]): Devotional {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    category: row.category || 'faith',
    scripture: row.scripture || '',
    content: row.content || '',
    reflection: row.reflection || '',
    prayerPoints: Array.isArray(row.prayer_points) ? row.prayer_points : [],
    completed: completedIds.includes(row.id),
  };
}

type DevotionalFilter = 'week' | 'all';

export default function DevotionalScreen() {
  const theme = useAppTheme();
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [selectedDevotional, setSelectedDevotional] = useState<Devotional | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<DevotionalFilter>('week');
  const [totalOnPlatform, setTotalOnPlatform] = useState<number>(0);
  const [userCompletedTotal, setUserCompletedTotal] = useState<number>(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  const loadDevotionals = useCallback(async () => {
    try {
      setIsLoading(true);
      const completedRaw = await AsyncStorage.getItem('completedDevotionals');
      const completedIds: string[] = completedRaw ? JSON.parse(completedRaw) : [];

      const cid = await getTenantChurchIdForDataScope();
      let countQ = supabase.from('devotionals').select('*', { count: 'exact', head: true });
      if (cid) countQ = countQ.eq('church_id', cid);
      const { count } = await countQ;
      setTotalOnPlatform(count ?? 0);

      if (completedIds.length > 0) {
        let exQ = supabase.from('devotionals').select('id').in('id', completedIds);
        if (cid) exQ = exQ.eq('church_id', cid);
        const { data: existing } = await exQ;
        setUserCompletedTotal((existing ?? []).length);
      } else {
        setUserCompletedTotal(0);
      }

      let rows: any[] = [];
      if (filter === 'week') {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const weekEndStr = weekEnd.toISOString().split('T')[0];
        let wq = supabase
          .from('devotionals')
          .select('*')
          .gte('date', weekStartStr)
          .lte('date', weekEndStr)
          .order('date', { ascending: false });
        if (cid) wq = wq.eq('church_id', cid);
        const { data, error } = await wq;
        if (error) throw error;
        rows = data || [];
      } else {
        rows = (await getDevotionals(100, 0)) || [];
      }
      const list = rows.map((row: any) => mapRowToDevotional(row, completedIds));
      setDevotionals(list);
    } catch (error) {
      console.error('Error loading devotionals:', error);
      setDevotionals([]);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      loadDevotionals();
    }, [loadDevotionals])
  );

  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    loadDevotionals();
  }, [filter, loadDevotionals]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }
  }, []);

  const markAsComplete = async (devotionalId: string) => {
    try {
      const completed = await AsyncStorage.getItem('completedDevotionals');
      const completedIds = completed ? JSON.parse(completed) : [];
      if (!completedIds.includes(devotionalId)) {
        completedIds.push(devotionalId);
        await AsyncStorage.setItem('completedDevotionals', JSON.stringify(completedIds));
        setUserCompletedTotal((prev) => prev + 1);
        setDevotionals((prev) =>
          prev.map((d) => (d.id === devotionalId ? { ...d, completed: true } : d))
        );
        const user = await getCurrentUser();
        const userId = (user as any)?.id;
        if (userId) {
          await awardXp(userId, 'devotional', { referenceId: devotionalId, referenceType: 'devotional' });
          notifyAchievementUnlockIfNew(userId, 'devotional_streak').catch(() => {});
        }
      }
      setSelectedDevotional(null);
    } catch (error) {
      console.error('Error marking devotional as complete:', error);
    }
  };

  const completedCount = devotionals.filter((d) => d.completed).length;
  const progressPercentage = devotionals.length > 0 ? (completedCount / devotionals.length) * 100 : 0;

  const ContentWrapper = Platform.OS === 'web' ? View : Animated.View;
  const containerStyle = Platform.OS === 'web'
    ? [styles.container, isVisible && styles.visible]
    : [styles.container, { opacity: fadeAnim }];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDevotionals();
    setRefreshing(false);
  }, [loadDevotionals]);

  if (selectedDevotional) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.detailScreen}>
          <View style={styles.detailHeader}>
            <Gradient colors={theme.headerSoftGradient} style={styles.detailHeaderGradient} />
            <TouchableOpacity onPress={() => setSelectedDevotional(null)} style={styles.backButton} activeOpacity={0.8}>
              <ArrowLeft size={22} color={COLORS.primary} strokeWidth={2} />
              <Text style={styles.backButtonText}>Voltar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.detailCategoryBadge, { backgroundColor: `${COLORS.secondary}18` }]}>
              <BookOpen size={16} color={COLORS.secondary} />
              <Text style={styles.detailCategoryText}>{getDevotionalCategoryLabel(selectedDevotional.category)}</Text>
            </View>
            <Text style={styles.detailTitle}>{selectedDevotional.title}</Text>
            <Text style={styles.detailDate}>{new Date(selectedDevotional.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>Escritura</Text>
              <View style={styles.scriptureBlock}>
                <Text style={styles.scripture}>{selectedDevotional.scripture}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>Devocional</Text>
              <Text style={styles.content}>{selectedDevotional.content}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>Reflexão</Text>
              <View style={styles.reflectionBlock}>
                <Text style={styles.reflection}>{selectedDevotional.reflection}</Text>
              </View>
            </View>

            {(selectedDevotional.prayerPoints?.length ?? 0) > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>Pontos de Oração</Text>
                {selectedDevotional.prayerPoints.map((point, index) => (
                  <View key={index} style={styles.prayerPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.prayerPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}

            {!selectedDevotional.completed && (
              <TouchableOpacity style={styles.completeButton} onPress={() => markAsComplete(selectedDevotional.id)} activeOpacity={0.9}>
                <CheckCircle size={22} color="#fff" strokeWidth={2} />
                <Text style={styles.completeButtonText}>Marcar como completo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ContentWrapper style={containerStyle}>
        <View style={styles.premiumHeader}>
          <Gradient colors={theme.headerSoftGradient} style={styles.headerBackgroundGradient} />
          <View style={styles.headerContentWrapper}>
            <View style={styles.headerTextBlock}>
              <View style={styles.sectionTitleRow}>
                <BookOpen size={20} color={COLORS.primary} />
                <Text style={styles.headerTitle}>Devocionais</Text>
              </View>
              <Text style={styles.headerSubtitle}>Alimente seu espírito semanalmente</Text>
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressCardInner}>
              <View style={styles.progressIconCircle}>
                <Sparkles size={18} color={COLORS.secondary} />
              </View>
              <View style={styles.progressTextBlock}>
                <Text style={styles.progressTitle}>Seu progresso</Text>
                <Text style={styles.progressCount}>
                  {devotionals.length > 0 ? `${completedCount} de ${devotionals.length} completos` : '0 completos'}
                </Text>
              </View>
            </View>
            <Progress.Bar
              progress={progressPercentage / 100}
              width={null}
              height={6}
              color={COLORS.primary}
              unfilledColor={COLORS.border}
              borderWidth={0}
              borderRadius={3}
              style={styles.progressBar}
            />
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statsCardInner}>
              <View style={[styles.progressIconCircle, { backgroundColor: `${COLORS.primary}18` }]}>
                <BookOpen size={18} color={COLORS.primary} />
              </View>
              <View style={styles.progressTextBlock}>
                <Text style={styles.progressTitle}>Na plataforma</Text>
                <Text style={styles.progressCount}>
                  {totalOnPlatform} devocionais no total · Você completou {userCompletedTotal}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'week' && styles.filterChipActive]}
              onPress={() => setFilter('week')}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, filter === 'week' && styles.filterChipTextActive]}>Devocional da semana</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
              onPress={() => setFilter('all')}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>Todos</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{filter === 'week' ? 'Devocionais da semana' : 'Todos os devocionais'}</Text>
              {devotionals.length > 0 && filter === 'week' && (
                <View style={styles.weekBadge}>
                  <Text style={styles.weekBadgeText}>SEMANA</Text>
                </View>
              )}
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Carregando devocionais...</Text>
              </View>
            ) : devotionals.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <BookOpen size={32} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>
                  {filter === 'week' ? 'Nenhum devocional esta semana' : 'Nenhum devocional disponível'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {filter === 'week' ? 'Os devocionais da semana aparecerão aqui.' : 'Os devocionais criados pelo admin aparecerão aqui.'}
                </Text>
              </View>
            ) : (
              devotionals.map((devotional) => (
                <TouchableOpacity
                  key={devotional.id}
                  style={[styles.devotionalCard, devotional.completed && styles.devotionalCardCompleted]}
                  onPress={() => setSelectedDevotional(devotional)}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardLeftAccent} />
                  <View style={styles.cardBody}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.categoryBadge, { backgroundColor: `${COLORS.secondary}18` }]}>
                        <Text style={styles.categoryText}>{getDevotionalCategoryLabel(devotional.category)}</Text>
                      </View>
                      {devotional.completed && (
                        <View style={styles.completedBadge}>
                          <CheckCircle size={18} color={COLORS.success} strokeWidth={2} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>{devotional.title}</Text>
                    <Text style={styles.cardScripture} numberOfLines={1}>{devotional.scripture}</Text>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardDate}>{new Date(devotional.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</Text>
                      <View style={styles.cardChevron}>
                        <ChevronRight size={20} color={COLORS.primary} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </ContentWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flex: 1,
    ...(Platform.OS === 'web' && { opacity: 0, transition: 'opacity 0.4s ease-out' }),
  },
  visible: { opacity: 1 },

  premiumHeader: { backgroundColor: '#FFF', paddingBottom: 20, position: 'relative' },
  headerBackgroundGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: '100%', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContentWrapper: { paddingHorizontal: SPACING.LG, paddingTop: Platform.OS === 'ios' ? 8 : 16 },
  headerTextBlock: { marginBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1C1C1E', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#8E8E93', marginTop: 4, fontWeight: '500' },

  progressCard: { marginHorizontal: SPACING.LG, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 16, ...SHADOWS.medium, elevation: 4 },
  statsCard: { marginHorizontal: SPACING.LG, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 16, ...SHADOWS.medium, elevation: 4 },
  statsCardInner: { flexDirection: 'row', alignItems: 'center' },
  progressCardInner: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0E6', justifyContent: 'center', alignItems: 'center' },
  progressTextBlock: { marginLeft: 12, flex: 1 },
  progressTitle: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
  progressCount: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginTop: 2 },
  progressBar: { marginTop: 0 },

  filterRow: { flexDirection: 'row', gap: 10, marginHorizontal: SPACING.LG, marginTop: 16, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark },
  filterChipText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: 0.2 },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },

  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  weekBadge: { backgroundColor: COLORS.secondary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  weekBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  devotionalCard: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 20, marginBottom: 12, overflow: 'hidden', ...SHADOWS.small },
  devotionalCardCompleted: { borderWidth: 1, borderColor: `${COLORS.success}30` },
  cardLeftAccent: { width: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
  cardBody: { flex: 1, padding: SPACING.MD },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  categoryText: { fontSize: 11, fontWeight: '700', color: COLORS.secondary, letterSpacing: 0.5 },
  completedBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${COLORS.success}18`, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 6 },
  cardScripture: { fontSize: 13, color: '#8E8E93', fontStyle: 'italic', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  cardChevron: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${COLORS.primary}12`, justifyContent: 'center', alignItems: 'center' },

  loadingContainer: { padding: SPACING.XXL, alignItems: 'center' },
  loadingText: { fontSize: 15, color: COLORS.textSecondary, marginTop: SPACING.MD, fontWeight: '500' },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.XL, alignItems: 'center', ...SHADOWS.small },
  emptyIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.MD },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary },

  detailScreen: { flex: 1, backgroundColor: COLORS.background },
  detailHeader: { paddingHorizontal: SPACING.LG, paddingVertical: SPACING.MD, position: 'relative' },
  detailHeaderGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: '100%' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backButtonText: { fontSize: 16, color: COLORS.primary, fontWeight: '700' },
  detailContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  detailCategoryBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, gap: 6 },
  detailCategoryText: { fontSize: 12, fontWeight: '700', color: COLORS.secondary },
  detailTitle: { fontSize: 24, fontWeight: '800', color: '#1C1C1E', marginTop: 12, marginBottom: 6 },
  detailDate: { fontSize: 15, color: '#8E8E93', marginBottom: SPACING.LG, fontWeight: '500' },
  detailSection: { marginBottom: SPACING.LG },
  detailSectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 10, letterSpacing: 0.5 },
  scriptureBlock: { backgroundColor: COLORS.surfaceVariant, padding: SPACING.MD, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: COLORS.secondary },
  scripture: { ...TYPOGRAPHY.body, fontStyle: 'italic', lineHeight: 24 },
  content: { ...TYPOGRAPHY.body, lineHeight: 24 },
  reflectionBlock: { backgroundColor: COLORS.surfaceVariant, padding: SPACING.MD, borderRadius: 16 },
  reflection: { ...TYPOGRAPHY.body, lineHeight: 24, fontStyle: 'italic' },
  prayerPoint: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.SM },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 8, marginRight: SPACING.SM },
  prayerPointText: { ...TYPOGRAPHY.body, flex: 1, lineHeight: 24 },
  completeButton: { ...globalStyles.button, backgroundColor: COLORS.success, flexDirection: 'row', gap: 10, marginTop: SPACING.LG, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  completeButtonText: { ...globalStyles.buttonText },
});