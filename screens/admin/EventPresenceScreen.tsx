import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  Users,
  Calendar,
  X,
  UserCheck,
  QrCode,
  CreditCard,
  CheckCircle,
  Clock,
  Trash2,
  UserPlus,
  ArrowLeft,
} from 'lucide-react-native';
import { supabase, getEventRegistrations, updateRegistrationPaymentStatus, getAttendanceRecords, deleteAttendanceRecord, createAttendanceRecord, getAllUsers } from '../../services/supabase';
import Gradient from '../../components/ui/Gradient';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';

function isEventToday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

export default function EventPresenceScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventStats, setEventStats] = useState<any[]>([]);
  const [registrationsByEvent, setRegistrationsByEvent] = useState<Record<string, any[]>>({});
  const [attendanceByEvent, setAttendanceByEvent] = useState<Record<string, any[]>>({});
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  const [deletingAttendanceId, setDeletingAttendanceId] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualUsers, setManualUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedManualUserId, setSelectedManualUserId] = useState<string | null>(null);
  const [savingManual, setSavingManual] = useState(false);

  const fetchPresenceData = useCallback(async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, date, time, is_paid')
        .order('date', { ascending: false });

      if (eventsError) throw eventsError;
      const events: any[] = eventsData || [];

      const { data: rsvpsData, error: rsvpsError } = await supabase
        .from('event_rsvps')
        .select('event_id, user_id, users!fk_event_rsvps_users(name)');

      if (rsvpsError) throw rsvpsError;
      const rsvpsByEvent: Record<string, any[]> = {};
      (rsvpsData || []).forEach((r: any) => {
        if (!rsvpsByEvent[r.event_id]) rsvpsByEvent[r.event_id] = [];
        rsvpsByEvent[r.event_id].push(r);
      });

      const eventsWithRsvps = events.map((ev: any) => ({
        ...ev,
        event_rsvps: rsvpsByEvent[ev.id] || [],
      }));
      setEventStats(eventsWithRsvps);

      const regs: Record<string, any[]> = {};
      for (const ev of events) {
        try {
          const list = await getEventRegistrations(ev.id);
          regs[ev.id] = list;
        } catch (_) {
          regs[ev.id] = [];
        }
      }
      setRegistrationsByEvent(regs);

      const att: Record<string, any[]> = {};
      for (const ev of events) {
        try {
          const list = await getAttendanceRecords(ev.id);
          att[ev.id] = list || [];
        } catch (_) {
          att[ev.id] = [];
        }
      }
      setAttendanceByEvent(att);
    } catch (e) {
      console.error('Erro ao buscar presenças:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPresenceData();
    }, [fetchPresenceData])
  );

  const openDetails = (event: any) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const handleMarkPayment = async (registrationId: string, currentPaid: boolean) => {
    setUpdatingPayment(registrationId);
    try {
      await updateRegistrationPaymentStatus(registrationId, !currentPaid);
      setRegistrationsByEvent((prev) => {
        const evId = selectedEvent?.id;
        if (!evId || !prev[evId]) return prev;
        return {
          ...prev,
          [evId]: prev[evId].map((r) =>
            r.id === registrationId ? { ...r, payment_status: currentPaid ? 'pending' : 'paid' } : r
          ),
        };
      });
    } catch (_) {}
    finally {
      setUpdatingPayment(null);
    }
  };

  const openQRForEvent = (eventId: string) => {
    setModalVisible(false);
    navigation.navigate('QRCodeScanner', { eventId });
  };

  const openManualPresenceModal = async () => {
    setSelectedManualUserId(null);
    setShowManualModal(true);
    try {
      const data = await getAllUsers();
      setManualUsers((data ?? []).filter((u: any) => u.role !== 'admin').map((u: any) => ({ id: u.id, name: u.name || u.email || 'Sem nome' })));
    } catch (e) {
      console.error('Erro ao carregar usuários:', e);
      Alert.alert('Erro', 'Não foi possível carregar a lista de usuários.');
    }
  };

  const saveManualPresence = async () => {
    if (!selectedEvent?.id || !selectedManualUserId) {
      Alert.alert('Atenção', 'Selecione uma pessoa para registrar a presença.');
      return;
    }
    setSavingManual(true);
    try {
      const created = await createAttendanceRecord({
        user_id: selectedManualUserId,
        event_id: selectedEvent.id,
        method: 'manual',
        notes: null,
      });
      const user = manualUsers.find((u) => u.id === selectedManualUserId);
      setAttendanceByEvent((prev) => ({
        ...prev,
        [selectedEvent.id]: [...(prev[selectedEvent.id] || []), { id: (created as { id?: string } | null)?.id ?? '', user_id: selectedManualUserId, users: { name: user?.name }, check_in_time: new Date().toISOString() }],
      }));
      setShowManualModal(false);
      setSelectedManualUserId(null);
      Alert.alert('Sucesso', `Presença de ${user?.name ?? 'usuário'} registrada.`);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível registrar a presença.');
    } finally {
      setSavingManual(false);
    }
  };

  const handleDeleteAttendance = (att: { id: string; users?: { name?: string } }) => {
    const name = att.users?.name || 'esta pessoa';
    Alert.alert(
      'Excluir presença',
      `Remover a presença de ${name}? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeletingAttendanceId(att.id);
            try {
              await deleteAttendanceRecord(att.id);
              const evId = selectedEvent?.id;
              if (evId) {
                setAttendanceByEvent((prev) => ({
                  ...prev,
                  [evId]: (prev[evId] || []).filter((a: any) => a.id !== att.id),
                }));
              }
            } catch (e) {
              console.error('Erro ao excluir presença:', e);
              Alert.alert('Erro', 'Não foi possível excluir a presença.');
            } finally {
              setDeletingAttendanceId(null);
            }
          },
        },
      ]
    );
  };

  const todayEvent = eventStats.find((e) => isEventToday(e.date));

  const renderEventItem = ({ item }: { item: any }) => {
    const regs = registrationsByEvent[item.id] || [];
    const rsvps = item.event_rsvps || [];
    const presenças = attendanceByEvent[item.id] || [];
    const total = rsvps.length + regs.length + presenças.length;
    return (
      <TouchableOpacity style={styles.eventCard} onPress={() => openDetails(item)} activeOpacity={0.8}>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <View style={styles.dateRow}>
            <Calendar size={14} color={COLORS.textSecondary} />
            <Text style={styles.eventDate}>
              {item.date ? new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data'}
            </Text>
          </View>
        </View>
        <View style={styles.statsBadge}>
          <Users size={16} color={COLORS.primary} />
          <Text style={styles.statsCount}>{total}</Text>
        </View>
        {isEventToday(item.date) && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>Hoje</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Gradient colors={[COLORS.gradientStart, COLORS.gradientMiddle]} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            accessibilityLabel="Voltar"
          >
            <ArrowLeft size={24} color="#fff" strokeWidth={2} />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Presença em Eventos</Text>
          <Text style={styles.headerSub}>Inscrições, pagamentos e lista de presença</Text>
        </SafeAreaView>
      </Gradient>

      {todayEvent && (
        <View style={styles.todayCard}>
          <View style={styles.todayCardContent}>
            <Text style={styles.todayLabel}>Evento do dia</Text>
            <Text style={styles.todayTitle}>{todayEvent.title}</Text>
            <TouchableOpacity
              style={styles.qrButton}
              onPress={() => openQRForEvent(todayEvent.id)}
              activeOpacity={0.8}
            >
              <QrCode size={22} color="#fff" />
              <Text style={styles.qrButtonText}>Ler QR Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={eventStats}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum evento encontrado.</Text>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPresenceData(); }} colors={[COLORS.primary]} />
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>{selectedEvent?.title}</Text>
                <Text style={styles.modalSub}>
                  {((selectedEvent?.event_rsvps?.length) || 0) + ((registrationsByEvent[selectedEvent?.id] || []).length)} inscritos
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedEvent && (
              <View style={styles.presenceActionsRow}>
                {isEventToday(selectedEvent.date) && (
                  <TouchableOpacity
                    style={styles.qrButtonInline}
                    onPress={() => openQRForEvent(selectedEvent.id)}
                  >
                    <QrCode size={20} color="#fff" />
                    <Text style={styles.qrButtonText}>Ler QR Code</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.qrButtonInline, styles.manualButton]}
                  onPress={openManualPresenceModal}
                >
                  <UserPlus size={20} color="#fff" />
                  <Text style={styles.qrButtonText}>Presença manual</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView style={styles.namesScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionLabel}>Confirmados (app)</Text>
              {(selectedEvent?.event_rsvps || []).length > 0 ? (
                selectedEvent.event_rsvps.map((rsvp: any, idx: number) => (
                  <View key={rsvp.user_id + idx} style={styles.nameRow}>
                    <View style={styles.avatarCircle}>
                      <UserCheck size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.nameText}>{rsvp.users?.name || 'Usuário'}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>Nenhum confirmado pelo app.</Text>
              )}

              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Inscrições (formulário)</Text>
              {(registrationsByEvent[selectedEvent?.id] || []).length > 0 ? (
                (registrationsByEvent[selectedEvent?.id] || []).map((reg: any) => (
                  <View key={reg.id} style={styles.nameRow}>
                    <View style={styles.avatarCircle}>
                      <CreditCard size={18} color={reg.payment_status === 'paid' ? COLORS.success : COLORS.textSecondary} />
                    </View>
                    <View style={styles.regInfo}>
                      <Text style={styles.nameText}>{reg.full_name}</Text>
                      <Text style={styles.regEmail}>{reg.email}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.paidChip, reg.payment_status === 'paid' && styles.paidChipActive]}
                      onPress={() => handleMarkPayment(reg.id, reg.payment_status === 'paid')}
                      disabled={updatingPayment === reg.id}
                    >
                      {updatingPayment === reg.id ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <>
                          {reg.payment_status === 'paid' ? <CheckCircle size={14} color="#fff" /> : null}
                          <Text style={[styles.paidChipText, reg.payment_status === 'paid' && { color: '#fff' }]}>
                            {reg.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>Nenhuma inscrição por formulário.</Text>
              )}

              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Presenças registradas</Text>
              {(attendanceByEvent[selectedEvent?.id] || []).length > 0 ? (
                (attendanceByEvent[selectedEvent?.id] || []).map((att: any, idx: number) => (
                  <View key={att.id || idx} style={styles.nameRow}>
                    <View style={styles.avatarCircle}>
                      <Clock size={18} color={COLORS.secondary} />
                    </View>
                    <View style={styles.regInfo}>
                      <Text style={styles.nameText}>{att.users?.name || 'Usuário'}</Text>
                      <Text style={styles.regEmail}>
                        {att.check_in_time
                          ? new Date(att.check_in_time).toLocaleString('pt-BR', { timeStyle: 'short' })
                          : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteAttendanceBtn}
                      onPress={() => handleDeleteAttendance(att)}
                      disabled={deletingAttendanceId === att.id}
                    >
                      {deletingAttendanceId === att.id ? (
                        <ActivityIndicator size="small" color={COLORS.error} />
                      ) : (
                        <Trash2 size={20} color={COLORS.error} />
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>Nenhuma presença registrada ainda.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showManualModal} animationType="slide" transparent onRequestClose={() => setShowManualModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar presença manual</Text>
              <TouchableOpacity onPress={() => setShowManualModal(false)} style={styles.closeButton}>
                <X size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {selectedEvent && (
              <Text style={styles.manualEventLabel}>Evento: {selectedEvent.title}</Text>
            )}
            <Text style={styles.sectionLabel}>Selecione a pessoa</Text>
            <ScrollView style={styles.manualUserList} showsVerticalScrollIndicator={false}>
              {(manualUsers
                .filter((u) => !(attendanceByEvent[selectedEvent?.id] || []).some((a: any) => a.user_id === u.id))
                .map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.manualUserRow, selectedManualUserId === u.id && styles.manualUserRowActive]}
                    onPress={() => setSelectedManualUserId(selectedManualUserId === u.id ? null : u.id)}
                  >
                    <Text style={styles.nameText}>{u.name}</Text>
                  </TouchableOpacity>
                )))}
              {manualUsers.filter((u) => !(attendanceByEvent[selectedEvent?.id] || []).some((a: any) => a.user_id === u.id)).length === 0 && (
                <Text style={styles.noDataText}>Todos já têm presença registrada ou não há usuários.</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.manualConfirmBtn, (!selectedManualUserId || savingManual) && { opacity: 0.6 }]}
              onPress={saveManualPresence}
              disabled={!selectedManualUserId || savingManual}
            >
              {savingManual ? <ActivityIndicator color="#fff" /> : <Text style={styles.qrButtonText}>Confirmar presença</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: SPACING.LG },
  headerSafe: { paddingHorizontal: SPACING.LG, paddingTop: SPACING.SM },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  backButtonText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  headerTitle: { ...TYPOGRAPHY.h2, color: '#fff', fontWeight: '800' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  todayCard: {
    marginHorizontal: SPACING.LG,
    marginTop: -SPACING.MD,
    marginBottom: SPACING.MD,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    ...SHADOWS.medium,
  },
  todayCardContent: {},
  todayLabel: { fontSize: 12, fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', marginBottom: 4 },
  todayTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.MD,
    alignSelf: 'flex-start',
  },
  qrButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  presenceActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  qrButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.MD,
    flex: 1,
  },
  manualButton: { backgroundColor: COLORS.secondary },
  manualEventLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },
  manualUserList: { maxHeight: 280, marginBottom: 16 },
  manualUserRow: { paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  manualUserRowActive: { backgroundColor: `${COLORS.primary}18` },
  manualConfirmBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: BORDER_RADIUS.MD, alignItems: 'center' },
  listContent: { padding: SPACING.LG, paddingBottom: 40 },
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    marginBottom: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  eventInfo: { flex: 1 },
  eventTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  eventDate: { fontSize: 13, color: COLORS.textSecondary },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.LG,
  },
  statsCount: { fontWeight: '800', color: COLORS.primary },
  todayBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.textSecondary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: SPACING.LG,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  modalHeaderLeft: { flex: 1 },
  modalTitle: { ...TYPOGRAPHY.h2, color: COLORS.text },
  modalSub: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  closeButton: { padding: 4 },
  namesScroll: { maxHeight: 400 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  deleteAttendanceBtn: { padding: 8, marginLeft: 8 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nameText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  regInfo: { flex: 1 },
  regEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  paidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paidChipActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  paidChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  noDataText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: 12 },
});
