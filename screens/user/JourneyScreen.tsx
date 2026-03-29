/**
 * Tela da Jornada Espiritual
 * Jornada de crescimento espiritual: passos, etapas bíblicas e constância. Sem ranking.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, Heart, Calendar, PenLine, Sparkles, Flame, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Gradient from '../../components/ui/Gradient';
import SpiritualProgressBar from '../../components/SpiritualProgressBar';
import SpiritualLevelCard from '../../components/SpiritualLevelCard';
import LevelDisclaimer from '../../components/LevelDisclaimer';
import {
  getJourneySummary,
  getXpEarnedToday,
} from '../../services/spiritualJourney';
import { getCurrentUser } from '../../services/supabase';
import {
  DAILY_XP_CAP,
  XP_BY_ACTION,
  GROWTH_UNIT_LABEL,
  PROGRESSION_CRITERIA_LABELS,
  getSuggestedFeaturesForLevel,
} from '../../constants/spiritualJourney';

/** Chaves exibidas no card (disciplinas têm valor variável e aparecem na tela de Disciplinas) */
const JOURNEY_ACTION_KEYS: (keyof typeof XP_BY_ACTION)[] = [
  'devotional',
  'prayer_register',
  'event_checkin',
  'reflection',
];

export default function JourneyScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<{
    totalXp: number;
    level: number;
    levelName: string;
    levelDescription?: string;
    levelShortDescription?: string;
    levelVerse?: string;
    xpInCurrentLevel: number;
    xpNeededForNextLevel: number;
    progressPercent: number;
    streakWeeks: number;
  } | null>(null);
  const [xpToday, setXpToday] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const user = await getCurrentUser();
    const userId = (user as any)?.id;
    if (!userId) {
      setIsLoading(false);
      return;
    }
    try {
      const [s, xp] = await Promise.all([
        getJourneySummary(userId),
        getXpEarnedToday(userId),
      ]);
      if (s) setSummary(s);
      setXpToday(xp);
    } catch (e) {
      console.error('JourneyScreen loadData', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando sua jornada...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Gradient
        colors={[theme.gradientStart, theme.gradientMiddle]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => (navigation as any).navigate('UserDashboard')} activeOpacity={0.8}>
          <ArrowLeft size={24} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jornada Espiritual</Text>
        <Text style={styles.headerSubtitle}>Seu progresso é só seu. Foco na constância.</Text>
        {summary && (
          <View style={styles.xpTodayBadge}>
            <Text style={styles.xpTodayText}>{xpToday} / {DAILY_XP_CAP} {GROWTH_UNIT_LABEL} hoje</Text>
          </View>
        )}
      </Gradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {summary ? (
          <>
            <View style={styles.card}>
              <SpiritualProgressBar
                levelName={summary.levelName}
                level={summary.level}
                levelDescription={summary.levelShortDescription ?? summary.levelDescription}
                levelVerse={summary.levelVerse}
                levelInspirationalPhrase={summary.levelInspirationalPhrase}
                xpInCurrentLevel={summary.xpInCurrentLevel}
                xpNeededForNextLevel={summary.xpNeededForNextLevel}
                progressPercent={summary.progressPercent}
                totalXp={summary.totalXp}
                streakWeeks={summary.streakWeeks}
              />
            </View>

            <SpiritualLevelCard
              levelName={summary.levelName}
              level={summary.level}
              shortDescription={summary.levelShortDescription ?? summary.levelDescription}
              verse={summary.levelVerse}
              progressPercent={summary.progressPercent}
            />
            <LevelDisclaimer />

            {/* Indicado para seu nível — incentivo, nada é bloqueado */}
            {(() => {
              const suggested = getSuggestedFeaturesForLevel(summary.level);
              if (suggested.length === 0) return null;
              return (
                <View style={styles.suggestedSection}>
                  <Text style={styles.sectionTitle}>Indicado para seu nível ({summary.levelName})</Text>
                  <Text style={styles.suggestedHint}>Explore quando quiser — tudo continua disponível.</Text>
                  <View style={styles.suggestedList}>
                    {suggested.map((f) => (
                      <TouchableOpacity
                        key={f.id}
                        style={styles.suggestedItem}
                        onPress={() => {
                          const parent = navigation.getParent() as any;
                          if (f.screen && parent?.navigate) parent.navigate('MainTabs', { screen: f.screen });
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.suggestedIconWrap}>
                          <Sparkles size={18} color={COLORS.spiritualGold} />
                        </View>
                        <Text style={styles.suggestedItemText} numberOfLines={2}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })()}

            <Text style={styles.sectionTitle}>Práticas que contam na sua jornada</Text>
            <View style={styles.actionsGrid}>
              {JOURNEY_ACTION_KEYS.map((key) => (
                <View key={key} style={styles.actionCard}>
                  {key === 'devotional' && <BookOpen size={24} color={COLORS.primary} />}
                  {key === 'prayer_register' && <Heart size={24} color={COLORS.primary} />}
                  {key === 'event_checkin' && <Calendar size={24} color={COLORS.primary} />}
                  {key === 'reflection' && <PenLine size={24} color={COLORS.primary} />}
                  <Text style={styles.actionLabel}>{PROGRESSION_CRITERIA_LABELS[key]}</Text>
                  <Text style={styles.actionXp}>+{XP_BY_ACTION[key]} {GROWTH_UNIT_LABEL}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.caption}>
              Cada prática conta até 1x por dia. Seu progresso nunca volta para trás — a constância é o que importa.
            </Text>

            <TouchableOpacity
              style={styles.reflectionLink}
              onPress={() => navigation.getParent()?.navigate?.('MainTabs', { screen: 'SpiritualReflectionsScreen' })}
              activeOpacity={0.8}
            >
              <PenLine size={22} color={COLORS.primary} />
              <View style={styles.reflectionLinkTextWrap}>
                <Text style={styles.reflectionLinkTitle}>Reflexões espirituais</Text>
                <Text style={styles.reflectionLinkSubtitle}>Escreva e veja suas reflexões na página dedicada</Text>
              </View>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Sparkles size={48} color={COLORS.spiritualGold} />
            <Text style={styles.emptyTitle}>Sua jornada começa aqui</Text>
            <Text style={styles.emptySubtitle}>
              Leitura bíblica, oração, reflexões e participação em eventos são práticas que contam na sua jornada. Não há punição por pausas — seu progresso só avança.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, fontSize: 16, color: COLORS.textSecondary },
  header: {
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.XL,
    paddingHorizontal: SPACING.LG,
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  headerTitle: { ...TYPOGRAPHY.h1, color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: SPACING.MD },
  xpTodayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  xpTodayText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  card: { marginBottom: SPACING.LG },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: SPACING.MD },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: SPACING.SM },
  actionCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    ...SHADOWS.small,
  },
  actionLabel: { ...TYPOGRAPHY.bodySmall, color: COLORS.text, marginTop: 6 },
  actionXp: { ...TYPOGRAPHY.caption, color: COLORS.success, fontWeight: '700', marginTop: 2 },
  caption: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: SPACING.LG },
  suggestedSection: { marginBottom: SPACING.LG },
  suggestedHint: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: SPACING.MD },
  suggestedList: { gap: SPACING.SM },
  suggestedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  suggestedIconWrap: { marginRight: SPACING.SM },
  suggestedItemText: { ...TYPOGRAPHY.bodySmall, color: COLORS.text, flex: 1 },
  reflectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  reflectionLinkTextWrap: { flex: 1, marginLeft: SPACING.MD },
  reflectionLinkTitle: { ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.text },
  reflectionLinkSubtitle: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: 16, textAlign: 'center' },
  emptySubtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
});
