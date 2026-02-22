import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, CheckCircle, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Progress from 'react-native-progress';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, globalStyles, SHADOWS } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { getDevotionalCategoryLabel } from '../../constants/devotionalCategories';
import { Devotional } from '../../types/models';

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

export default function DevotionalScreen() {
  const [devotionals, setDevotionals] = useState<Devotional[]>([]);
  const [selectedDevotional, setSelectedDevotional] = useState<Devotional | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  const loadDevotionals = useCallback(async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const completedRaw = await AsyncStorage.getItem('completedDevotionals');
      const completedIds: string[] = completedRaw ? JSON.parse(completedRaw) : [];

      const { data: rows, error } = await supabase
        .from('devotionals')
        .select('*')
        .gte('date', weekStartStr)
        .lte('date', weekEndStr)
        .order('date', { ascending: false });

      if (error) throw error;
      const list = (rows || []).map((row) => mapRowToDevotional(row, completedIds));
      setDevotionals(list);
    } catch (error) {
      console.error('Error loading devotionals:', error);
      setDevotionals([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDevotionals();
    }, [loadDevotionals])
  );

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
        setDevotionals((prev) =>
          prev.map((d) => (d.id === devotionalId ? { ...d, completed: true } : d))
        );
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

  if (selectedDevotional) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setSelectedDevotional(null)} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Voltar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.categoryBadge, { backgroundColor: `${COLORS.secondary}20` }]}>
              <BookOpen size={16} color={COLORS.secondary} />
              <Text style={[styles.categoryText, { color: COLORS.secondary }]}>{getDevotionalCategoryLabel(selectedDevotional.category)}</Text>
            </View>
            <Text style={styles.detailTitle}>{selectedDevotional.title}</Text>
            <Text style={styles.detailDate}>{new Date(selectedDevotional.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Escritura</Text>
              <Text style={styles.scripture}>{selectedDevotional.scripture}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Devocional</Text>
              <Text style={styles.content}>{selectedDevotional.content}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Reflexão</Text>
              <Text style={styles.reflection}>{selectedDevotional.reflection}</Text>
            </View>

            {(selectedDevotional.prayerPoints?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Pontos de Oração</Text>
                {selectedDevotional.prayerPoints.map((point, index) => (
                  <View key={index} style={styles.prayerPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.prayerPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}

            {!selectedDevotional.completed && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => markAsComplete(selectedDevotional.id)}
              >
                <CheckCircle size={20} color="#fff" />
                <Text style={styles.completeButtonText}>Marcar como Completo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <ContentWrapper style={containerStyle}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Devocionais Semanais</Text>
            <Text style={styles.headerSubtitle}>Alimente seu espírito semanalmente</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Seu Progresso</Text>
              <Text style={styles.progressText}>
                {devotionals.length > 0 ? `${completedCount} / ${devotionals.length} completos` : '0 completos'}
              </Text>
            </View>
            <Progress.Bar
              progress={progressPercentage / 100}
              width={null}
              height={8}
              color={COLORS.secondary}
              unfilledColor={COLORS.border}
              borderWidth={0}
              borderRadius={4}
            />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.secondary} />
                <Text style={styles.loadingText}>Carregando devocionais da semana...</Text>
              </View>
            ) : devotionals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <BookOpen size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyTitle}>Nenhum devocional esta semana</Text>
                <Text style={styles.emptySubtitle}>Os devocionais da semana aparecerão aqui.</Text>
              </View>
            ) : (
            devotionals.map((devotional) => (
              <TouchableOpacity
                key={devotional.id}
                style={styles.devotionalCard}
                onPress={() => setSelectedDevotional(devotional)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: `${COLORS.secondary}20` }]}>
                    <BookOpen size={14} color={COLORS.secondary} />
                    <Text style={[styles.categoryText, { color: COLORS.secondary }]}>{getDevotionalCategoryLabel(devotional.category)}</Text>
                  </View>
                  {devotional.completed && (
                    <View style={styles.completedBadge}>
                      <CheckCircle size={16} color={COLORS.success} />
                    </View>
                  )}
                </View>
                <Text style={styles.cardTitle}>{devotional.title}</Text>
                <Text style={styles.cardScripture} numberOfLines={2}>
                  {devotional.scripture}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardDate}>{new Date(devotional.date).toLocaleDateString('pt-BR')}</Text>
                  <ChevronRight size={20} color={COLORS.textSecondary} />
                </View>
              </TouchableOpacity>
            ))
            )}
          </ScrollView>
        </ContentWrapper>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      opacity: 0,
      transition: 'opacity 0.4s ease-out',
    }),
  },
  visible: {
    opacity: 1,
  },
  header: {
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.MD,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.XS,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  progressContainer: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.LG,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.MD,
    ...SHADOWS.small,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  progressTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  progressText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.LG,
  },
  devotionalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
    gap: SPACING.XS,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  completedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginBottom: SPACING.SM,
  },
  cardScripture: {
    ...TYPOGRAPHY.bodySmall,
    fontStyle: 'italic',
    marginBottom: SPACING.SM,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    ...TYPOGRAPHY.caption,
  },
  detailHeader: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
  },
  detailContent: {
    padding: SPACING.LG,
  },
  detailTitle: {
    ...TYPOGRAPHY.h2,
    marginTop: SPACING.SM,
    marginBottom: SPACING.XS,
  },
  detailDate: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.LG,
  },
  section: {
    marginBottom: SPACING.LG,
  },
  sectionLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.SM,
  },
  scripture: {
    ...TYPOGRAPHY.body,
    fontStyle: 'italic',
    lineHeight: 24,
    backgroundColor: COLORS.surfaceVariant,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  content: {
    ...TYPOGRAPHY.body,
    lineHeight: 24,
  },
  reflection: {
    ...TYPOGRAPHY.body,
    lineHeight: 24,
    fontStyle: 'italic',
    backgroundColor: COLORS.surfaceVariant,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
  },
  prayerPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 8,
    marginRight: SPACING.SM,
  },
  prayerPointText: {
    ...TYPOGRAPHY.body,
    flex: 1,
    lineHeight: 24,
  },
  completeButton: {
    ...globalStyles.button,
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    gap: SPACING.SM,
    marginTop: SPACING.LG,
  },
  completeButtonText: {
    ...globalStyles.buttonText,
  },
  loadingContainer: {
    padding: SPACING.XXL,
    alignItems: 'center',
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.MD,
  },
  emptyContainer: {
    padding: SPACING.XXL,
    alignItems: 'center',
  },
  emptyTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginTop: SPACING.MD,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SPACING.XS,
  },
});