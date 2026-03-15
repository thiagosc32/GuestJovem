/**
 * Badges (Conquistas) — celebra passos na jornada espiritual.
 * "Crescer não é competir, é permanecer."
 */

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Award,
  ArrowLeft,
  Flame,
  BookOpen,
  BookMarked,
  Calendar,
  PenLine,
  MessageCircle,
  ListChecks,
  Heart,
  Star,
  Sparkles,
  Target,
  Gem,
  Shield,
} from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Gradient from '../../components/ui/Gradient';
import { getCurrentUser } from '../../services/supabase';
import {
  getUserAchievementProgress,
  type UserAchievementProgress,
  ACHIEVEMENT_ICONS,
} from '../../services/achievementsService';

const BADGE_ICONS: Record<string, React.ComponentType<{ color: string; size: number }>> = {
  flame: Flame,
  book: BookOpen,
  'book-open': BookMarked,
  dove: Award,
  calendar: Calendar,
  'pen-line': PenLine,
  'message-circle': MessageCircle,
  'list-checks': ListChecks,
  heart: Heart,
  award: Award,
  star: Star,
  sparkles: Sparkles,
  target: Target,
  gem: Gem,
  shield: Shield,
};

export default function BadgesScreen() {
  const navigation = useNavigation<any>();
  const [achievements, setAchievements] = useState<UserAchievementProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBadges = useCallback(async () => {
    const user = await getCurrentUser();
    const userId = (user as any)?.id;
    if (!userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const progress = await getUserAchievementProgress(userId);
      setAchievements(progress);
    } catch (e) {
      console.error('BadgesScreen loadBadges', e);
      setAchievements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBadges();
  };

  const configs = achievements;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Gradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.getParent()?.navigate?.('MainTabs', { screen: 'UserDashboard' })}
          activeOpacity={0.8}
        >
          <ArrowLeft size={24} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Conquistas</Text>
        <Text style={styles.subtitle}>Celebre cada passo na sua jornada. Crescer não é competir, é permanecer.</Text>
      </Gradient>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando conquistas...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          {configs.length === 0 ? (
            <View style={styles.emptyState}>
              <Award size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>Nenhuma conquista configurada</Text>
              <Text style={styles.emptySubtitle}>As conquistas aparecerão aqui quando forem criadas pelo administrador.</Text>
            </View>
          ) : (
          configs.map((item) => {
            const def = item.definition;
            const progress = item.progress;
            const unlocked = item.unlocked;
            const maxP = def.max_progress ?? 1;
            const IconComp = BADGE_ICONS[def.icon] ?? Award;

            return (
              <View
                key={def.id}
                style={[styles.badgeCard, !unlocked && styles.badgeCardLocked]}
              >
                <View style={[styles.iconWrap, { backgroundColor: unlocked ? `${COLORS.success}22` : `${COLORS.border}` }]}>
                  <IconComp size={40} color={unlocked ? COLORS.success : COLORS.textSecondary} />
                </View>
                <View style={styles.badgeBody}>
                  <Text style={[styles.badgeTitle, !unlocked && styles.badgeTitleLocked]}>{def.title}</Text>
                  <Text style={styles.badgeDescription}>{def.description}</Text>
                  {!unlocked && (
                    <View style={styles.progressWrap}>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, (progress / maxP) * 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {progress} / {maxP}
                      </Text>
                    </View>
                  )}
                  {unlocked && (
                    <Text style={styles.unlockedText}>Desbloqueado</Text>
                  )}
                </View>
              </View>
            );
          })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: SPACING.LG, paddingBottom: SPACING.XL, paddingHorizontal: SPACING.LG },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  title: { ...TYPOGRAPHY.h1, color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 22 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  badgeCardLocked: { opacity: 0.85 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  badgeBody: { flex: 1 },
  badgeTitle: { ...TYPOGRAPHY.body, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  badgeTitleLocked: { color: COLORS.textSecondary },
  badgeDescription: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: 8 },
  progressWrap: { marginTop: 4 },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: { ...TYPOGRAPHY.caption, color: COLORS.primary, fontWeight: '600' },
  unlockedText: { ...TYPOGRAPHY.caption, color: COLORS.success, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: 16, textAlign: 'center' },
  emptySubtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
});
