import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Animated,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
  FlatList,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Calendar, Users, CheckCircle, Filter, Plus, X, UserPlus, Share2, List } from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { getAttendanceRecords, createAttendanceRecord, getEvents, getAllUsers } from '../../services/supabase';

type RecordDisplay = {
  id: string;
  userId: string;
  userName: string;
  eventName: string;
  checkInTime: string;
  checkInMethod: 'qr' | 'manual';
  notes?: string;
};

export default function AttendanceTracker() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'qr' | 'manual'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');
  const [records, setRecords] = useState<RecordDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [visitorEvents, setVisitorEvents] = useState<{ id: string; title: string; date: string }[]>([]);
  const [selectedVisitorEventId, setSelectedVisitorEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<{ id: string; title: string; date: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  const loadRecords = useCallback(async () => {
    try {
      const data = await getAttendanceRecords();
      const list: RecordDisplay[] = (data ?? []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.users?.name ?? 'Sem nome',
        eventName: r.events?.title ?? 'Evento',
        checkInTime: r.check_in_time,
        checkInMethod: r.method ?? 'manual',
        notes: r.notes ?? undefined,
      }));
      setRecords(list);
    } catch (e) {
      console.error('AttendanceTracker loadRecords', e);
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  useEffect(() => {
    if (Platform.OS === 'web') setTimeout(() => setIsVisible(true), 10);
    else Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
  }, []);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const byDate = records.filter((r) => {
    const t = new Date(r.checkInTime).getTime();
    if (dateFilter === 'today') return t >= todayStart.getTime() && t <= todayEnd.getTime();
    return true;
  });

  const filteredRecords = byDate.filter((record) => {
    const matchesSearch = record.userName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || record.checkInMethod === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const todayCount = records.filter((r) => {
    const t = new Date(r.checkInTime).getTime();
    return t >= todayStart.getTime() && t <= todayEnd.getTime();
  }).length;
  const qrCount = filteredRecords.filter((r) => r.checkInMethod === 'qr').length;
  const manualCount = filteredRecords.filter((r) => r.checkInMethod === 'manual').length;

  const getVisitorCheckInUrl = (eventId: string) => {
    const base = (typeof window !== 'undefined' && window?.location?.origin)
      ? window.location.origin
      : (process.env.EXPO_PUBLIC_WEB_URL || 'https://fireyouth.app');
    return `${base.replace(/\/$/, '')}/visitor/${eventId}`;
  };

  const openAddModal = async () => {
    setShowAddModal(true);
    setSelectedEventId(null);
    setSelectedUserId(null);
    try {
      const [evs, usrs] = await Promise.all([getEvents(100, 0), getAllUsers()]);
      setEvents(evs ?? []);
      setUsers((usrs ?? []).map((u: any) => ({ id: u.id, name: u.name || u.email || 'Sem nome' })));
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar eventos e usuários.');
    }
  };

  const openVisitorModal = async () => {
    setShowVisitorModal(true);
    setSelectedVisitorEventId(null);
    try {
      const evs = await getEvents(50, 0);
      setVisitorEvents((evs ?? []).map((e: any) => ({ id: e.id, title: e.title, date: e.date })));
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar eventos.');
    }
  };

  const shareVisitorLink = async () => {
    if (!selectedVisitorEventId) return;
    const url = getVisitorCheckInUrl(selectedVisitorEventId);
    try {
      await Share.share({
        message: `Registre sua presença: ${url}`,
        url: Platform.OS !== 'web' ? url : undefined,
        title: 'Registrar presença',
      });
    } catch (_) {}
  };

  const saveManualAttendance = async () => {
    if (!selectedUserId) {
      Alert.alert('Selecione o jovem', 'Escolha quem está registrando presença.');
      return;
    }
    setSaving(true);
    try {
      await createAttendanceRecord({
        user_id: selectedUserId,
        event_id: selectedEventId || null,
        method: 'manual',
        notes: null,
      });
      setShowAddModal(false);
      await loadRecords();
      Alert.alert('Sucesso', 'Presença registrada.');
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível registrar.');
    } finally {
      setSaving(false);
    }
  };

  const ContentWrapper = Platform.OS === 'web' ? View : Animated.View;
  const containerStyle = Platform.OS === 'web' ? [styles.container, isVisible && styles.visible] : [styles.container, { opacity: fadeAnim }];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <ContentWrapper style={containerStyle}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Controle de Presença</Text>
            <Text style={styles.headerSubtitle}>Dados reais • Check-ins e registro manual</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: `${COLORS.primary}15` }]}>
              <Users size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>{dateFilter === 'today' ? todayCount : records.length}</Text>
              <Text style={styles.statLabel}>{dateFilter === 'today' ? 'Hoje' : 'Total'}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: `${COLORS.success}15` }]}>
              <CheckCircle size={24} color={COLORS.success} />
              <Text style={styles.statValue}>{qrCount}</Text>
              <Text style={styles.statLabel}>QR</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: `${COLORS.secondary}15` }]}>
              <Calendar size={24} color={COLORS.secondary} />
              <Text style={styles.statValue}>{manualCount}</Text>
              <Text style={styles.statLabel}>Manual</Text>
            </View>
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterChip, dateFilter === 'today' && styles.filterChipActive]}
              onPress={() => setDateFilter('today')}
            >
              <Text style={[styles.filterText, dateFilter === 'today' && styles.filterTextActive]}>Hoje</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, dateFilter === 'all' && styles.filterChipActive]}
              onPress={() => setDateFilter('all')}
            >
              <Text style={[styles.filterText, dateFilter === 'all' && styles.filterTextActive]}>Todos</Text>
            </TouchableOpacity>
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
            <View style={styles.buttonsRow}>
              <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                <Plus size={20} color="#fff" />
                <Text style={styles.addButtonText}>Registrar presença</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.visitorButton} onPress={openVisitorModal}>
                <UserPlus size={20} color={COLORS.primary} />
                <Text style={styles.visitorButtonText}>Registrar visitante</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.visitorsLink}
              onPress={() => navigation.navigate('VisitorsControlScreen')}
            >
              <List size={18} color={COLORS.primary} />
              <Text style={styles.visitorsLinkText}>Ver registro de visitantes</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]} onPress={() => setSelectedFilter('all')}>
              <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterChip, selectedFilter === 'qr' && styles.filterChipActive]} onPress={() => setSelectedFilter('qr')}>
              <Text style={[styles.filterText, selectedFilter === 'qr' && styles.filterTextActive]}>QR Code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterChip, selectedFilter === 'manual' && styles.filterChipActive]} onPress={() => setSelectedFilter('manual')}>
              <Text style={[styles.filterText, selectedFilter === 'manual' && styles.filterTextActive]}>Manual</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRecords(); }} colors={[COLORS.primary]} />}
          >
            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : filteredRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={64} color={COLORS.textLight} />
                <Text style={styles.emptyText}>Nenhum registro de presença</Text>
                <Text style={styles.emptySubtext}>Use "Registrar presença" ou o QR no evento</Text>
              </View>
            ) : (
              filteredRecords.map((record) => (
                <View key={record.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <View style={styles.recordInfo}>
                      <Text style={styles.recordName}>{record.userName}</Text>
                      <Text style={styles.recordEvent}>{record.eventName}</Text>
                    </View>
                    <View style={[styles.methodBadge, { backgroundColor: record.checkInMethod === 'qr' ? `${COLORS.success}20` : `${COLORS.secondary}20` }]}>
                      <Text style={[styles.methodText, { color: record.checkInMethod === 'qr' ? COLORS.success : COLORS.secondary }]}>{record.checkInMethod.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.recordFooter}>
                    <Text style={styles.recordTime}>
                      {new Date(record.checkInTime).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </Text>
                    {record.notes ? <Text style={styles.recordNotes}>{record.notes}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </ContentWrapper>
      </View>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar presença manual</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}><X size={24} color={COLORS.text} /></TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Evento (opcional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalScroll}>
              <TouchableOpacity style={[styles.chip, !selectedEventId && styles.chipActive]} onPress={() => setSelectedEventId(null)}>
                <Text style={[styles.chipText, !selectedEventId && styles.chipTextActive]}>Nenhum</Text>
              </TouchableOpacity>
              {events.map((ev) => (
                <TouchableOpacity key={ev.id} style={[styles.chip, selectedEventId === ev.id && styles.chipActive]} onPress={() => setSelectedEventId(ev.id)}>
                  <Text style={[styles.chipText, selectedEventId === ev.id && styles.chipTextActive]} numberOfLines={1}>{ev.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.modalLabel}>Jovem *</Text>
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              style={styles.userList}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.userRow, selectedUserId === item.id && styles.userRowActive]} onPress={() => setSelectedUserId(item.id)}>
                  <Text style={styles.userName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={saveManualAttendance} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Registrar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showVisitorModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar visitante</Text>
              <TouchableOpacity onPress={() => setShowVisitorModal(false)}><X size={24} color={COLORS.text} /></TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>O visitante escaneia o QR abaixo ou o link para registrar a própria presença.</Text>
            <Text style={styles.modalLabel}>Evento</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalScroll}>
              {visitorEvents.map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  style={[styles.chip, selectedVisitorEventId === ev.id && styles.chipActive]}
                  onPress={() => setSelectedVisitorEventId(ev.id)}
                >
                  <Text style={[styles.chipText, selectedVisitorEventId === ev.id && styles.chipTextActive]} numberOfLines={1}>{ev.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selectedVisitorEventId && (
              <View style={styles.qrContainer}>
                <View style={styles.qrWrapper}>
                  <QRCode value={getVisitorCheckInUrl(selectedVisitorEventId)} size={200} />
                </View>
                <Text style={styles.qrHint}>Visitante escaneia e preenche 2 campos</Text>
                <TouchableOpacity style={styles.shareButton} onPress={shareVisitorLink}>
                  <Share2 size={20} color="#fff" />
                  <Text style={styles.shareButtonText}>Enviar link</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  visible: { opacity: 1 },
  header: { paddingHorizontal: SPACING.LG, paddingTop: SPACING.LG, paddingBottom: SPACING.MD },
  headerTitle: { ...TYPOGRAPHY.h2, marginBottom: SPACING.XS },
  headerSubtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  statsContainer: { flexDirection: 'row', paddingHorizontal: SPACING.LG, marginBottom: SPACING.MD, gap: SPACING.SM },
  statCard: { flex: 1, padding: SPACING.MD, borderRadius: BORDER_RADIUS.MD, alignItems: 'center' },
  statValue: { ...TYPOGRAPHY.h2, marginTop: SPACING.XS },
  statLabel: { ...TYPOGRAPHY.caption, marginTop: SPACING.XS },
  filterContainer: { flexDirection: 'row', paddingHorizontal: SPACING.LG, marginBottom: SPACING.SM, gap: SPACING.SM },
  filterChip: { paddingHorizontal: SPACING.MD, paddingVertical: SPACING.SM, borderRadius: BORDER_RADIUS.MD, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.text },
  filterTextActive: { color: '#fff' },
  searchContainer: { paddingHorizontal: SPACING.LG, marginBottom: SPACING.MD },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.MD, paddingHorizontal: SPACING.MD, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  searchIcon: { marginRight: SPACING.SM },
  searchInput: { flex: 1, height: 48, fontSize: 16, color: COLORS.text },
  buttonsRow: { flexDirection: 'row', gap: 8 },
  addButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: BORDER_RADIUS.MD },
  addButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  visitorButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: BORDER_RADIUS.MD, borderWidth: 1, borderColor: COLORS.primary },
  visitorButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  visitorsLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  visitorsLinkText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.LG },
  recordCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.MD, padding: SPACING.MD, marginBottom: SPACING.SM, ...SHADOWS.small },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.SM },
  recordInfo: { flex: 1 },
  recordName: { ...TYPOGRAPHY.body, fontWeight: '600', marginBottom: SPACING.XS },
  recordEvent: { ...TYPOGRAPHY.bodySmall },
  methodBadge: { paddingHorizontal: SPACING.SM, paddingVertical: SPACING.XS, borderRadius: BORDER_RADIUS.SM },
  methodText: { fontSize: 12, fontWeight: '600' },
  recordFooter: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.SM },
  recordTime: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  recordNotes: { ...TYPOGRAPHY.bodySmall, marginTop: SPACING.XS, fontStyle: 'italic' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.XXL },
  emptyText: { ...TYPOGRAPHY.h3, marginTop: SPACING.MD, marginBottom: SPACING.XS },
  emptySubtext: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', padding: SPACING.LG },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.LG },
  modalTitle: { ...TYPOGRAPHY.h3 },
  modalSubtitle: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.MD },
  modalLabel: { ...TYPOGRAPHY.bodySmall, marginBottom: 8, color: COLORS.textSecondary },
  modalScroll: { marginBottom: SPACING.MD, maxHeight: 44 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.border, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 14, color: COLORS.text },
  chipTextActive: { color: '#fff' },
  userList: { maxHeight: 200, marginBottom: SPACING.LG },
  userRow: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  userRowActive: { backgroundColor: `${COLORS.primary}15` },
  userName: { fontSize: 16, color: COLORS.text },
  saveButton: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: BORDER_RADIUS.MD, alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  qrContainer: { alignItems: 'center', paddingVertical: SPACING.LG },
  qrWrapper: { padding: 16, backgroundColor: '#fff', borderRadius: BORDER_RADIUS.LG },
  qrHint: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: SPACING.MD },
  shareButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.MD, backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: BORDER_RADIUS.MD },
  shareButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
