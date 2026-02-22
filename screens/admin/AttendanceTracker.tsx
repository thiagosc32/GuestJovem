import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Animated, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Calendar, Users, CheckCircle, Filter } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, globalStyles, SHADOWS } from '../../constants/theme';
import { mockAttendanceRecords, mockUsers } from '../../data/mockData';
import { AttendanceRecord } from '../../types/models';

export default function AttendanceTracker() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'qr' | 'manual'>('all');
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

  const filteredRecords = mockAttendanceRecords.filter((record) => {
    const matchesSearch = record.userName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || record.checkInMethod === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const todayCount = mockAttendanceRecords.length;
  const qrCount = mockAttendanceRecords.filter((r) => r.checkInMethod === 'qr').length;
  const manualCount = mockAttendanceRecords.filter((r) => r.checkInMethod === 'manual').length;

  const ContentWrapper = Platform.OS === 'web' ? View : Animated.View;
  const containerStyle = Platform.OS === 'web'
    ? [styles.container, isVisible && styles.visible]
    : [styles.container, { opacity: fadeAnim }];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <ContentWrapper style={containerStyle}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Controle de Presença</Text>
            <Text style={styles.headerSubtitle}>Monitore os check-ins dos jovens</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: `${COLORS.primary}15` }]}>
              <Users size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>{todayCount}</Text>
              <Text style={styles.statLabel}>Hoje</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: `${COLORS.success}15` }]}>
              <CheckCircle size={24} color={COLORS.success} />
              <Text style={styles.statValue}>{qrCount}</Text>
              <Text style={styles.statLabel}>QR Scans</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: `${COLORS.secondary}15` }]}>
              <Calendar size={24} color={COLORS.secondary} />
              <Text style={styles.statValue}>{manualCount}</Text>
              <Text style={styles.statLabel}>Manual</Text>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Search size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nome..."
                placeholderTextColor={COLORS.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
              onPress={() => setSelectedFilter('all')}
            >
              <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, selectedFilter === 'qr' && styles.filterChipActive]}
              onPress={() => setSelectedFilter('qr')}
            >
              <Text style={[styles.filterText, selectedFilter === 'qr' && styles.filterTextActive]}>QR Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, selectedFilter === 'manual' && styles.filterChipActive]}
              onPress={() => setSelectedFilter('manual')}
            >
              <Text style={[styles.filterText, selectedFilter === 'manual' && styles.filterTextActive]}>Manual</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={64} color={COLORS.textLight} />
                <Text style={styles.emptyText}>Nenhum registro de presença encontrado</Text>
                <Text style={styles.emptySubtext}>Ajuste sua busca ou filtros</Text>
              </View>
            ) : (
              filteredRecords.map((record) => (
                <View key={record.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <View style={styles.recordInfo}>
                      <Text style={styles.recordName}>{record.userName}</Text>
                      <Text style={styles.recordEvent}>{record.eventName || 'Check-in Geral'}</Text>
                    </View>
                    <View
                      style={[
                        styles.methodBadge,
                        { backgroundColor: record.checkInMethod === 'qr' ? `${COLORS.success}20` : `${COLORS.secondary}20` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.methodText,
                          { color: record.checkInMethod === 'qr' ? COLORS.success : COLORS.secondary },
                        ]}
                      >
                        {record.checkInMethod.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.recordFooter}>
                    <Text style={styles.recordTime}>
                      {new Date(record.checkInTime).toLocaleTimeString('pt-BR', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </Text>
                    {record.notes && <Text style={styles.recordNotes}>{record.notes}</Text>}
                  </View>
                </View>
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.LG,
    marginBottom: SPACING.LG,
    gap: SPACING.SM,
  },
  statCard: {
    flex: 1,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
  },
  statValue: {
    ...TYPOGRAPHY.h2,
    marginTop: SPACING.XS,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.XS,
  },
  searchContainer: {
    paddingHorizontal: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: SPACING.SM,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: COLORS.text,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.LG,
    marginBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  filterChip: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.LG,
  },
  recordCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    ...SHADOWS.small,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },
  recordEvent: {
    ...TYPOGRAPHY.bodySmall,
  },
  methodBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
  },
  methodText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recordFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.SM,
  },
  recordTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  recordNotes: {
    ...TYPOGRAPHY.bodySmall,
    marginTop: SPACING.XS,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XXL,
  },
  emptyText: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
});