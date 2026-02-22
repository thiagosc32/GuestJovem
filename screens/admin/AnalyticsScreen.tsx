import React, { useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Users, BookOpen, Heart, Calendar } from 'lucide-react-native';
import ProgressCard from '../../components/ProgressCard';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { mockAnalytics } from '../../data/mockData';

export default function AnalyticsScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

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

  const metrics = [
    { label: 'Total de Jovens', value: mockAnalytics.totalYouth, icon: Users, color: COLORS.primary, change: '+5%' },
    { label: 'Jovens Ativos', value: mockAnalytics.activeYouth, icon: TrendingUp, color: COLORS.success, change: '+8%' },
    { label: 'Presença Média', value: mockAnalytics.averageAttendance, icon: Calendar, color: COLORS.secondary, change: '+3%' },
    { label: 'Pedidos de Oração', value: mockAnalytics.prayerRequests, icon: Heart, color: COLORS.spiritualOrange, change: '+12%' },
  ];

  const ContentWrapper = Platform.OS === 'web' ? View : Animated.View;
  const containerStyle = Platform.OS === 'web'
    ? [styles.container, isVisible && styles.visible]
    : [styles.container, { opacity: fadeAnim }];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <ContentWrapper style={containerStyle}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Análises & Insights</Text>
            <Text style={styles.headerSubtitle}>Visão geral de desempenho do ministério</Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.metricsGrid}>
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <View key={index} style={styles.metricCard}>
                    <View style={styles.metricHeader}>
                      <View style={[styles.iconContainer, { backgroundColor: `${metric.color}20` }]}>
                        <Icon size={24} color={metric.color} />
                      </View>
                      <View style={[styles.changeBadge, { backgroundColor: `${COLORS.success}20` }]}>
                        <Text style={[styles.changeText, { color: COLORS.success }]}>{metric.change}</Text>
                      </View>
                    </View>
                    <Text style={styles.metricValue}>{metric.value}</Text>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Métricas de Engajamento</Text>
              <ProgressCard
                title="Conclusão de Devocionais"
                progress={mockAnalytics.devotionalCompletion}
                color={COLORS.secondary}
                subtitle={`${mockAnalytics.devotionalCompletion}% de taxa de conclusão esta semana`}
              />
              <View style={{ height: SPACING.MD }} />
              <ProgressCard
                title="Crescimento Semanal"
                progress={mockAnalytics.weeklyGrowth}
                color={COLORS.success}
                subtitle={`${mockAnalytics.weeklyGrowth}% de aumento no engajamento geral`}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tendências Mensais</Text>
              <View style={styles.trendCard}>
                {mockAnalytics.monthlyTrends.map((trend, index) => (
                  <View key={index} style={styles.trendRow}>
                    <Text style={styles.trendMonth}>{trend.month}</Text>
                    <View style={styles.trendBars}>
                      <View style={styles.trendBarContainer}>
                        <View
                          style={[
                            styles.trendBar,
                            { width: `${(trend.attendance / 40) * 100}%`, backgroundColor: COLORS.primary },
                          ]}
                        />
                        <Text style={styles.trendValue}>{trend.attendance}</Text>
                      </View>
                      <View style={styles.trendBarContainer}>
                        <View
                          style={[
                            styles.trendBar,
                            { width: `${(trend.devotionals / 500) * 100}%`, backgroundColor: COLORS.secondary },
                          ]}
                        />
                        <Text style={styles.trendValue}>{trend.devotionals}</Text>
                      </View>
                      <View style={styles.trendBarContainer}>
                        <View
                          style={[
                            styles.trendBar,
                            { width: `${(trend.prayers / 70) * 100}%`, backgroundColor: COLORS.spiritualOrange },
                          ]}
                        />
                        <Text style={styles.trendValue}>{trend.prayers}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={styles.legendText}>Presença</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} />
                  <Text style={styles.legendText}>Devocionais</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: COLORS.spiritualOrange }]} />
                  <Text style={styles.legendText}>Orações</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Destaques Principais</Text>
              <View style={styles.highlightCard}>
                <BookOpen size={32} color={COLORS.secondary} />
                <View style={styles.highlightContent}>
                  <Text style={styles.highlightTitle}>Orações Respondidas</Text>
                  <Text style={styles.highlightValue}>{mockAnalytics.answeredPrayers} este mês</Text>
                  <Text style={styles.highlightSubtext}>33% de taxa de resposta - Continue orando!</Text>
                </View>
              </View>
              <View style={styles.highlightCard}>
                <Calendar size={32} color={COLORS.primary} />
                <View style={styles.highlightContent}>
                  <Text style={styles.highlightTitle}>Eventos Próximos</Text>
                  <Text style={styles.highlightValue}>{mockAnalytics.upcomingEvents} agendados</Text>
                  <Text style={styles.highlightSubtext}>Próximo evento: Culto de Sexta à Noite</Text>
                </View>
              </View>
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.LG,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.SM,
    marginBottom: SPACING.LG,
  },
  metricCard: {
    width: '50%',
    padding: SPACING.SM,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.XS,
  },
  metricLabel: {
    ...TYPOGRAPHY.bodySmall,
  },
  section: {
    marginBottom: SPACING.XL,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.MD,
  },
  trendCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    ...SHADOWS.small,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  trendMonth: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    width: 40,
  },
  trendBars: {
    flex: 1,
    gap: SPACING.XS,
  },
  trendBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },
  trendBar: {
    height: 8,
    borderRadius: 4,
  },
  trendValue: {
    ...TYPOGRAPHY.caption,
    marginLeft: SPACING.SM,
    minWidth: 30,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.MD,
    marginTop: SPACING.MD,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...TYPOGRAPHY.caption,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    ...SHADOWS.small,
  },
  highlightContent: {
    flex: 1,
    marginLeft: SPACING.MD,
  },
  highlightTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },
  highlightValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.XS,
  },
  highlightSubtext: {
    ...TYPOGRAPHY.bodySmall,
  },
});