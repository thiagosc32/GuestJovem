/**
 * Disciplinas Espirituais
 * Checklist privado: cada check gera log, XP e alimenta a Jornada.
 * Diárias resetam todo dia; semanais, toda semana; mensais, todo mês.
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
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Circle, BookOpen, Calendar, Sparkles, ArrowLeft } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Gradient from '../../components/ui/Gradient';
import {
  getDisciplines,
  getCompletionSets,
  completeDiscipline,
  getWeeklyProgress,
} from '../../services/spiritualDisciplines';
import { getCompanionState } from '../../services/spiritualCompanion';
import { getCurrentUser } from '../../services/supabase';
import type { SpiritualDiscipline } from '../../constants/spiritualDisciplines';
import type { SpiritualCompanionState } from '../../types/spiritualCompanion';
import type { CompanionStateKey } from '../../constants/spiritualCompanion';
import { isConstancyStateBetter, getConstancyLevelUpContent, type ConstancyLevelUpContent } from '../../constants/spiritualCompanion';
import SpiritualCompanion from '../../components/SpiritualCompanion';
import ConstancyLevelUpModal from '../../components/ConstancyLevelUpModal';

export default function DisciplinesScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<any>();
  const [disciplines, setDisciplines] = useState<{
    daily: SpiritualDiscipline[];
    weekly: SpiritualDiscipline[];
    monthly: SpiritualDiscipline[];
  } | null>(null);
  const [completedDaily, setCompletedDaily] = useState<Set<string>>(new Set());
  const [completedWeekly, setCompletedWeekly] = useState<Set<string>>(new Set());
  const [completedMonthly, setCompletedMonthly] = useState<Set<string>>(new Set());
  const [weeklyProgress, setWeeklyProgress] = useState({ daysWithActivity: 0, totalDays: 7 });
  const [companion, setCompanion] = useState<SpiritualCompanionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tappingKey, setTappingKey] = useState<string | null>(null);
  const [showConstancyLevelUpModal, setShowConstancyLevelUpModal] = useState(false);
  const [constancyLevelUpContent, setConstancyLevelUpContent] = useState<ConstancyLevelUpContent | null>(null);

  const loadData = useCallback(async () => {
    const user = await getCurrentUser();
    const userId = (user as any)?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const [disc, sets, progress, comp] = await Promise.all([
        getDisciplines(),
        getCompletionSets(userId),
        getWeeklyProgress(userId),
        getCompanionState(userId),
      ]);
      setDisciplines(disc);
      setCompletedDaily(sets.completedDaily);
      setCompletedWeekly(sets.completedWeekly);
      setCompletedMonthly(sets.completedMonthly);
      setWeeklyProgress(progress);
      setCompanion(comp);
      const newState = comp?.state ?? null;
      if (newState && userId) {
        try {
          const storageKey = `constancy_state_${userId}`;
          const prevState = await AsyncStorage.getItem(storageKey) as CompanionStateKey | null;
          if (prevState !== null && prevState !== newState && isConstancyStateBetter(prevState, newState)) {
            const content = getConstancyLevelUpContent(newState, prevState);
            if (content) {
              setConstancyLevelUpContent(content);
              setShowConstancyLevelUpModal(true);
            }
          }
          await AsyncStorage.setItem(storageKey, newState);
        } catch (_) {}
      }
    } catch (e) {
      console.error('DisciplinesScreen loadData', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleToggle = async (d: SpiritualDiscipline) => {
    const user = await getCurrentUser();
    const userId = (user as any)?.id;
    if (!userId) return;

    const completed =
      d.category === 'daily' ? completedDaily.has(d.key) : d.category === 'weekly' ? completedWeekly.has(d.key) : completedMonthly.has(d.key);
    if (completed) return;

    setTappingKey(d.key);
    try {
      const result = await completeDiscipline(userId, d.key);
      if (result.success) {
        if (d.category === 'daily') setCompletedDaily((prev) => new Set(prev).add(d.key));
        else if (d.category === 'weekly') setCompletedWeekly((prev) => new Set(prev).add(d.key));
        else setCompletedMonthly((prev) => new Set(prev).add(d.key));
        await loadData();
      } else {
        Alert.alert('Disciplina', result.message ?? 'Não foi possível registrar.');
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Tente novamente.');
    } finally {
      setTappingKey(null);
    }
  };

  const isCompleted = (d: SpiritualDiscipline) =>
    d.category === 'daily' ? completedDaily.has(d.key) : d.category === 'weekly' ? completedWeekly.has(d.key) : completedMonthly.has(d.key);

  const dailyDone = disciplines ? disciplines.daily.filter((d) => completedDaily.has(d.key)).length : 0;
  const dailyTotal = disciplines?.daily.length ?? 0;
  const feedback =
    dailyTotal > 0 && dailyDone >= dailyTotal
      ? 'Todas as diárias de hoje concluídas!'
      : dailyTotal > 0
        ? `Faltam ${dailyTotal - dailyDone} diária(s) para hoje.`
        : 'Marque as disciplinas que você praticou.';

  if (loading && !disciplines) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando disciplinas...</Text>
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
        <Text style={styles.headerTitle}>Disciplinas Espirituais</Text>
        <Text style={styles.headerSubtitle}>Seu checklist privado. Cada check gera XP na Jornada.</Text>
      </Gradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Vida Espiritual (ligado às disciplinas / constância) */}
        <SpiritualCompanion companion={companion} />

        {/* Progresso semanal */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Calendar size={22} color={COLORS.primary} />
            <Text style={styles.progressTitle}>Progresso esta semana</Text>
          </View>
          <Text style={styles.progressValue}>
            {weeklyProgress.daysWithActivity} de {weeklyProgress.totalDays} dias com alguma disciplina
          </Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, (weeklyProgress.daysWithActivity / weeklyProgress.totalDays) * 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Feedback espiritual */}
        <View style={styles.feedbackCard}>
          <Sparkles size={20} color={COLORS.spiritualGold} />
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>

        {/* Diárias */}
        <Text style={styles.sectionTitle}>Diárias</Text>
        <Text style={styles.sectionHint}>Resetam todo dia à meia-noite.</Text>
        {(disciplines?.daily ?? []).map((d) => (
          <DisciplineRow
            key={d.key}
            discipline={d}
            completed={isCompleted(d)}
            loading={tappingKey === d.key}
            onPress={() => handleToggle(d)}
          />
        ))}

        {/* Semanais */}
        <Text style={styles.sectionTitle}>Semanais</Text>
        <Text style={styles.sectionHint}>Resetam no início de cada semana.</Text>
        {(disciplines?.weekly ?? []).map((d) => (
          <DisciplineRow
            key={d.key}
            discipline={d}
            completed={isCompleted(d)}
            loading={tappingKey === d.key}
            onPress={() => handleToggle(d)}
          />
        ))}

        {/* Mensais / Opcionais */}
        <Text style={styles.sectionTitle}>Mensais / Opcionais</Text>
        <Text style={styles.sectionHint}>Resetam a cada mês.</Text>
        {(disciplines?.monthly ?? []).map((d) => (
          <DisciplineRow
            key={d.key}
            discipline={d}
            completed={isCompleted(d)}
            loading={tappingKey === d.key}
            onPress={() => handleToggle(d)}
          />
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Seus dados são privados. Nenhum ranking é exibido.</Text>
        </View>
      </ScrollView>
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

function DisciplineRow({
  discipline,
  completed,
  loading,
  onPress,
}: {
  discipline: SpiritualDiscipline;
  completed: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, completed && styles.rowCompleted]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} style={styles.rowIcon} />
      ) : completed ? (
        <CheckCircle size={26} color={COLORS.success} style={styles.rowIcon} />
      ) : (
        <Circle size={26} color={COLORS.textLight} style={styles.rowIcon} />
      )}
      <Text style={[styles.rowTitle, completed && styles.rowTitleCompleted]} numberOfLines={2}>
        {discipline.title}
      </Text>
      {!completed && <Text style={styles.rowXp}>+{discipline.xpAmount} XP</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, fontSize: 16, color: COLORS.textSecondary },
  header: { paddingTop: SPACING.LG, paddingBottom: SPACING.XL, paddingHorizontal: SPACING.LG },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  headerTitle: { ...TYPOGRAPHY.h1, color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    marginBottom: SPACING.MD,
    ...SHADOWS.small,
  },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  progressTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  progressValue: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 8 },
  progressBarBg: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceVariant ?? '#FFF8F0',
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.spiritualGold,
  },
  feedbackText: { ...TYPOGRAPHY.body, color: COLORS.text, flex: 1 },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: 4 },
  sectionHint: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: SPACING.SM },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    ...SHADOWS.small,
  },
  rowCompleted: { backgroundColor: `${COLORS.success}08`, borderWidth: 1, borderColor: `${COLORS.success}30` },
  rowIcon: { marginRight: 12 },
  rowTitle: { ...TYPOGRAPHY.body, color: COLORS.text, flex: 1 },
  rowTitleCompleted: { color: COLORS.textSecondary },
  rowXp: { ...TYPOGRAPHY.caption, color: COLORS.success, fontWeight: '700' },
  footer: { marginTop: SPACING.LG, alignItems: 'center' },
  footerText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
});
