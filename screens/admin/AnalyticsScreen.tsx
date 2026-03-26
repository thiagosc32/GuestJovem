import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TrendingUp, Users, BookOpen, Heart, Calendar, ChevronRight, X } from 'lucide-react-native';
import ProgressCard from '../../components/ProgressCard';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { getAdminAnalytics } from '../../services/supabase';

type DetailModalKey =
  | 'totalYouth'
  | 'activeYouth'
  | 'avgAttendance'
  | 'prayers'
  | 'devotionals'
  | 'weeklyGrowth'
  | 'trends'
  | 'answeredPrayers'
  | 'upcomingEvents'
  | null;

/** Espaço reservado para a altura do tab bar admin (≈ App.tsx) + folga, só web. */
const WEB_TAB_BAR_EXTRA = 88;

export default function AnalyticsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);
  const [detailModal, setDetailModal] = useState<DetailModalKey>(null);
  const [analytics, setAnalytics] = useState<{
    totalYouth: number;
    activeYouth: number;
    averageAttendance: number;
    devotionalCompletion: number;
    prayerRequests: number;
    answeredPrayers: number;
    upcomingEvents: number;
    weeklyGrowth: number;
    monthlyTrends: { month: string; attendance: number; devotionals: number; prayers: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const data = await getAdminAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error('AnalyticsScreen load', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const metrics: { key: DetailModalKey; label: string; value: string | number; icon: any; color: string; change: string }[] = [
    { key: 'totalYouth', label: 'Total de Jovens', value: analytics?.totalYouth ?? '—', icon: Users, color: COLORS.primary, change: analytics ? `${analytics.weeklyGrowth >= 0 ? '+' : ''}${analytics.weeklyGrowth}% sem.` : '—' },
    { key: 'activeYouth', label: 'Jovens Ativos', value: analytics?.activeYouth ?? '—', icon: TrendingUp, color: COLORS.success, change: '30 dias' },
    { key: 'avgAttendance', label: 'Presença Média', value: analytics?.averageAttendance ?? '—', icon: Calendar, color: COLORS.secondary, change: 'por evento' },
    { key: 'prayers', label: 'Pedidos de Oração', value: analytics?.prayerRequests ?? '—', icon: Heart, color: COLORS.spiritualOrange, change: analytics ? `${analytics.answeredPrayers} respondidos` : '—' },
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
            contentContainerStyle={[
              styles.scrollContent,
              Platform.OS === 'web' && { paddingBottom: SPACING.XL + WEB_TAB_BAR_EXTRA + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[COLORS.primary]} />}
          >
            {loading ? (
              <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            ) : (
            <>
            <View style={styles.metricsGrid}>
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.metricCard}
                    onPress={() => metric.key && setDetailModal(metric.key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.metricHeader}>
                      <View style={[styles.iconContainer, { backgroundColor: `${metric.color}20` }]}>
                        <Icon size={24} color={metric.color} />
                      </View>
                      <View style={[styles.changeBadge, { backgroundColor: `${COLORS.success}20` }]}>
                        <Text style={[styles.changeText, { color: COLORS.success }]} numberOfLines={1}>{metric.change}</Text>
                      </View>
                    </View>
                    <Text style={styles.metricValue}>{metric.value}</Text>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <View style={styles.metricHint}>
                      <Text style={styles.metricHintText}>Toque para detalhes</Text>
                      <ChevronRight size={14} color={COLORS.textLight} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Métricas de Engajamento</Text>
              <TouchableOpacity onPress={() => setDetailModal('devotionals')} activeOpacity={0.8}>
                <ProgressCard
                  title="Conclusão de Devocionais (esta semana)"
                  progress={analytics?.devotionalCompletion ?? 0}
                  color={COLORS.secondary}
                  subtitle={`${analytics?.devotionalCompletion ?? 0}% dos jovens fizeram ao menos 1 devocional`}
                />
              </TouchableOpacity>
              <View style={{ height: SPACING.MD }} />
              <TouchableOpacity onPress={() => setDetailModal('weeklyGrowth')} activeOpacity={0.8}>
                <ProgressCard
                  title="Crescimento Semanal (presenças)"
                  progress={Math.min(100, Math.max(0, (analytics?.weeklyGrowth ?? 0) + 50))}
                  color={COLORS.success}
                  subtitle={`${(analytics?.weeklyGrowth ?? 0) >= 0 ? '+' : ''}${analytics?.weeklyGrowth ?? 0}% em relação à semana anterior`}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tendências Mensais</Text>
              <TouchableOpacity onPress={() => setDetailModal('trends')} activeOpacity={0.8}>
              <View style={styles.trendCard}>
                {(analytics?.monthlyTrends ?? []).map((trend, index) => (
                  <View key={index} style={styles.trendRow}>
                    <Text style={styles.trendMonth}>{trend.month}</Text>
                    <View style={styles.trendBars}>
                      <View style={styles.trendBarContainer}>
                        <View
                          style={[
                            styles.trendBar,
                            { width: `${Math.min(100, (trend.attendance / Math.max(1, Math.max(...(analytics?.monthlyTrends ?? [{ attendance: 1 }]).map(t => t.attendance)))) * 100)}%`, backgroundColor: COLORS.primary },
                          ]}
                        />
                        <Text style={styles.trendValue}>{trend.attendance}</Text>
                      </View>
                      <View style={styles.trendBarContainer}>
                        <View
                          style={[
                            styles.trendBar,
                            { width: `${Math.min(100, (trend.devotionals / Math.max(1, Math.max(...(analytics?.monthlyTrends ?? [{ devotionals: 1 }]).map(t => t.devotionals)))) * 100)}%`, backgroundColor: COLORS.secondary },
                          ]}
                        />
                        <Text style={styles.trendValue}>{trend.devotionals}</Text>
                      </View>
                      <View style={styles.trendBarContainer}>
                        <View
                          style={[
                            styles.trendBar,
                            { width: `${Math.min(100, (trend.prayers / Math.max(1, Math.max(...(analytics?.monthlyTrends ?? [{ prayers: 1 }]).map(t => t.prayers)))) * 100)}%`, backgroundColor: COLORS.spiritualOrange },
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
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Destaques Principais</Text>
              <TouchableOpacity onPress={() => setDetailModal('answeredPrayers')} activeOpacity={0.8}>
                <View style={styles.highlightCard}>
                  <BookOpen size={32} color={COLORS.secondary} />
                  <View style={styles.highlightContent}>
                    <Text style={styles.highlightTitle}>Orações Respondidas</Text>
                    <Text style={styles.highlightValue}>{analytics?.answeredPrayers ?? 0} no total</Text>
                    <Text style={styles.highlightSubtext}>
                      {analytics && analytics.prayerRequests > 0 ? `${Math.round(((analytics.answeredPrayers ?? 0) / analytics.prayerRequests) * 100)}% de taxa de resposta` : 'Nenhum pedido ainda'}
                    </Text>
                    <Text style={styles.detailHint}>Toque para detalhes</Text>
                  </View>
                  <ChevronRight size={20} color={COLORS.textLight} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDetailModal('upcomingEvents')} activeOpacity={0.8}>
                <View style={styles.highlightCard}>
                  <Calendar size={32} color={COLORS.primary} />
                  <View style={styles.highlightContent}>
                    <Text style={styles.highlightTitle}>Eventos Próximos</Text>
                    <Text style={styles.highlightValue}>{analytics?.upcomingEvents ?? 0} agendados</Text>
                    <Text style={styles.highlightSubtext}>Eventos com data a partir de hoje</Text>
                    <Text style={styles.detailHint}>Toque para detalhes</Text>
                  </View>
                  <ChevronRight size={20} color={COLORS.textLight} />
                </View>
              </TouchableOpacity>
            </View>
            </>
            )}
          </ScrollView>

          <Modal visible={!!detailModal} transparent animationType="fade">
            <Pressable style={styles.modalOverlay} onPress={() => setDetailModal(null)}>
              <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {detailModal === 'totalYouth' && 'Total de Jovens'}
                    {detailModal === 'activeYouth' && 'Jovens Ativos'}
                    {detailModal === 'avgAttendance' && 'Presença Média'}
                    {detailModal === 'prayers' && 'Pedidos de Oração'}
                    {detailModal === 'devotionals' && 'Conclusão de Devocionais'}
                    {detailModal === 'weeklyGrowth' && 'Crescimento Semanal'}
                    {detailModal === 'trends' && 'Tendências Mensais'}
                    {detailModal === 'answeredPrayers' && 'Orações Respondidas'}
                    {detailModal === 'upcomingEvents' && 'Eventos Próximos'}
                  </Text>
                  <TouchableOpacity onPress={() => setDetailModal(null)}>
                    <X size={24} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  {detailModal === 'totalYouth' && (
                    <>
                      <Text style={styles.modalValue}>{analytics?.totalYouth ?? 0}</Text>
                      <Text style={styles.modalDesc}>Pessoas cadastradas no app (incluindo membros e admins).</Text>
                      <Text style={styles.modalBullet}>• Crescimento semanal: {(analytics?.weeklyGrowth ?? 0) >= 0 ? '+' : ''}{analytics?.weeklyGrowth ?? 0}%</Text>
                      <TouchableOpacity style={styles.modalAction} onPress={() => { setDetailModal(null); navigation.navigate('UserManagement'); }}>
                        <Text style={styles.modalActionText}>Ver gestão de usuários</Text>
                        <ChevronRight size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    </>
                  )}
                  {detailModal === 'activeYouth' && (
                    <>
                      <Text style={styles.modalValue}>{analytics?.activeYouth ?? 0}</Text>
                      <Text style={styles.modalDesc}>Jovens ativos nos últimos 30 dias (presença em eventos, devocionais ou orações registradas).</Text>
                      <Text style={styles.modalBullet}>• Considera check-in em eventos, conclusão de devocionais e uso do app</Text>
                      <TouchableOpacity style={styles.modalAction} onPress={() => { setDetailModal(null); navigation.navigate('AdminActiveYouth'); }}>
                        <Text style={styles.modalActionText}>Ver lista de jovens ativos</Text>
                        <ChevronRight size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    </>
                  )}
                  {detailModal === 'avgAttendance' && (
                    <>
                      <Text style={styles.modalValue}>{analytics?.averageAttendance ?? 0}</Text>
                      <Text style={styles.modalDesc}>Média de check-ins por evento com presença registrada.</Text>
                      <Text style={styles.modalBullet}>• Baseado nos eventos que tiveram ao menos 1 presença</Text>
                      <TouchableOpacity style={styles.modalAction} onPress={() => { setDetailModal(null); navigation.navigate('PresençaStack', { screen: 'EventPresenceScreen' }); }}>
                        <Text style={styles.modalActionText}>Ver presença por evento</Text>
                        <ChevronRight size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    </>
                  )}
                  {detailModal === 'prayers' && (
                    <>
                      <Text style={styles.modalValue}>{analytics?.prayerRequests ?? 0}</Text>
                      <Text style={styles.modalDesc}>Total de pedidos de oração registrados no ministério.</Text>
                      <Text style={styles.modalBullet}>• Respondidos: {analytics?.answeredPrayers ?? 0}</Text>
                      <Text style={styles.modalBullet}>• Taxa: {analytics && analytics.prayerRequests > 0 ? Math.round(((analytics.answeredPrayers ?? 0) / analytics.prayerRequests) * 100) : 0}%</Text>
                      <TouchableOpacity style={styles.modalAction} onPress={() => { setDetailModal(null); navigation.navigate('AdminPrivatePrayers'); }}>
                        <Text style={styles.modalActionText}>Ver pedidos de oração</Text>
                        <ChevronRight size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    </>
                  )}
                  {detailModal === 'devotionals' && (
                    <>
                      <Text style={styles.modalValue}>{analytics?.devotionalCompletion ?? 0}%</Text>
                      <Text style={styles.modalDesc}>Porcentagem de jovens que concluíram ao menos 1 devocional esta semana.</Text>
                      <TouchableOpacity style={styles.modalAction} onPress={() => { setDetailModal(null); navigation.navigate('AdminDevotionalCompletions'); }}>
                        <Text style={styles.modalActionText}>Ver conclusões de devocionais</Text>
                        <ChevronRight size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    </>
                  )}
                  {detailModal === 'weeklyGrowth' && (
                    <>
                      <Text style={styles.modalValue}>{(analytics?.weeklyGrowth ?? 0) >= 0 ? '+' : ''}{analytics?.weeklyGrowth ?? 0}%</Text>
                      <Text style={styles.modalDesc}>Variação de presenças em relação à semana anterior.</Text>
                      <Text style={styles.modalBullet}>• Compara check-ins desta semana vs. semana passada</Text>
                      <Text style={styles.modalBullet}>• Positivo = mais engajamento; negativo = menos</Text>
                      <TouchableOpacity style={styles.modalAction} onPress={() => { setDetailModal(null); navigation.navigate('PresençaStack', { screen: 'AttendanceTracker' }); }}>
                        <Text style={styles.modalActionText}>Ver registro de presenças</Text>
                        <ChevronRight size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    </>
                  )}
                  {detailModal === 'trends' && (
                    <>
                      <Text style={styles.modalDesc}>Evolução mensal de presenças, devocionais e orações nos últimos 5 meses.</Text>
                      {(analytics?.monthlyTrends ?? []).map((t, i) => (
                        <View key={i} style={styles.trendModalRow}>
                          <Text style={styles.trendModalMonth}>{t.month}</Text>
                          <Text style={styles.trendModalVal}>Presença: {t.attendance} · Devocionais: {t.devotionals} · Orações: {t.prayers}</Text>
                        </View>
                      ))}
                    </>
                  )}
                  {detailModal === 'answeredPrayers' && (
                    <>
                      <Text style={styles.modalValue}>{analytics?.answeredPrayers ?? 0}</Text>
                      <Text style={styles.modalDesc}>Pedidos de oração marcados como respondidos.</Text>
                      <Text style={styles.modalBullet}>• Taxa de resposta: {analytics && analytics.prayerRequests > 0 ? Math.round(((analytics.answeredPrayers ?? 0) / analytics.prayerRequests) * 100) : 0}%</Text>
                      <TouchableOpacity style={styles.modalAction} onPress={() => { setDetailModal(null); navigation.navigate('AdminPrivatePrayers'); }}>
                        <Text style={styles.modalActionText}>Ver pedidos de oração</Text>
                        <ChevronRight size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    </>
                  )}
                  {detailModal === 'upcomingEvents' && (
                    <>
                      <Text style={styles.modalValue}>{analytics?.upcomingEvents ?? 0}</Text>
                      <Text style={styles.modalDesc}>Eventos com data a partir de hoje.</Text>
                      <TouchableOpacity style={styles.modalAction} onPress={() => { setDetailModal(null); navigation.navigate('UserTabs', { screen: 'EventsScreen' }); }}>
                        <Text style={styles.modalActionText}>Ver eventos</Text>
                        <ChevronRight size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>
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
    overflow: 'hidden',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
    minWidth: 0,
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
    flexShrink: 1,
    maxWidth: '65%',
    overflow: 'hidden',
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
  metricHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
    gap: 2,
  },
  metricHintText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  detailHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: SPACING.LG,
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    flex: 1,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalValue: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.SM,
  },
  modalDesc: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.MD,
  },
  modalBullet: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    marginBottom: SPACING.XS,
  },
  modalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.LG,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: BORDER_RADIUS.MD,
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  trendModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  trendModalMonth: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    width: 36,
  },
  trendModalVal: {
    ...TYPOGRAPHY.bodySmall,
    flex: 1,
  },
});