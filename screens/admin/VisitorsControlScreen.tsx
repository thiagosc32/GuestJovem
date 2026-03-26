/**
 * Controle de visitantes — admin
 * Lista presenças de visitantes, filtro por evento, busca por nome.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Users,
  ChevronLeft,
  Search,
  Calendar,
  UserPlus,
  Trash2,
  Filter,
} from 'lucide-react-native';
import Gradient from '../../components/ui/Gradient';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { getAllEventVisitors, deleteEventVisitor, getEvents } from '../../services/supabase';

type VisitorRow = {
  id: string;
  name: string;
  phone: string | null;
  eventTitle: string;
  eventDate: string;
  isFirstTime: boolean;
  contactOptIn: boolean;
  acceptedJesus: boolean;
  congregates: boolean;
  churchName: string | null;
  visitCount?: number;
  createdAt: string;
};

export default function VisitorsControlScreen({ navigation }: { navigation: any }) {
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [visitorsData, eventsData] = await Promise.all([
        getAllEventVisitors(selectedEventId ?? undefined),
        getEvents(50, 0),
      ]);
      const list: VisitorRow[] = (visitorsData ?? []).map((v: any) => ({
        id: v.id,
        name:
          v.name?.trim() ||
          (v.visitor_profiles as any)?.name ||
          'Visitante',
        phone: v.phone?.trim() ? v.phone.trim() : null,
        eventTitle: (v.events as any)?.title ?? 'Evento',
        eventDate: (v.events as any)?.date ?? '',
        isFirstTime: v.is_first_time ?? true,
        contactOptIn: v.contact_opt_in ?? false,
        acceptedJesus: v.accepted_jesus ?? false,
        congregates: v.congregates ?? false,
        churchName: v.church_name?.trim() ? v.church_name.trim() : null,
        visitCount: (v.visitor_profiles as any)?.visit_count,
        createdAt: v.created_at,
      }));
      setVisitors(list);
      setEvents((eventsData ?? []).map((e: any) => ({ id: e.id, title: e.title })));
    } catch (e) {
      console.error('VisitorsControlScreen loadData', e);
      setVisitors([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedEventId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filtered = visitors.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      v.name.toLowerCase().includes(q) ||
      v.eventTitle.toLowerCase().includes(q) ||
      (v.phone && v.phone.toLowerCase().includes(q)) ||
      (v.churchName && v.churchName.toLowerCase().includes(q))
    );
  });

  const handleDelete = (item: VisitorRow) => {
    Alert.alert(
      'Excluir registro',
      `Remover a presença de "${item.name}" no evento "${item.eventTitle}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await deleteEventVisitor(item.id);
              setVisitors((prev) => prev.filter((v) => v.id !== item.id));
            } catch (e: any) {
              Alert.alert('Erro', e.message ?? 'Não foi possível excluir.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: VisitorRow }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <UserPlus size={18} color={COLORS.primary} />
          <Text style={styles.cardName}>{item.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          disabled={deletingId === item.id}
          style={styles.deleteBtn}
        >
          {deletingId === item.id ? (
            <ActivityIndicator size="small" color={COLORS.error} />
          ) : (
            <Trash2 size={18} color={COLORS.error} />
          )}
        </TouchableOpacity>
      </View>
      <Text style={styles.cardEvent}>{item.eventTitle}</Text>
      {item.phone ? <Text style={styles.cardPhone}>Tel. {item.phone}</Text> : null}
      <View style={styles.cardMeta}>
        <Text style={styles.cardDate}>
          {item.eventDate
            ? new Date(item.eventDate + 'T12:00:00').toLocaleDateString('pt-BR')
            : '—'}
        </Text>
        <Text style={styles.cardTime}>
          {new Date(item.createdAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        {item.visitCount != null && item.visitCount > 0 && (
          <Text style={styles.cardVisits}>{item.visitCount} visitas</Text>
        )}
      </View>
      <View style={styles.badges}>
        {item.isFirstTime && (
          <View style={[styles.badge, styles.badgeFirst]}>
            <Text style={styles.badgeText}>1ª visita</Text>
          </View>
        )}
        {item.contactOptIn && (
          <View style={[styles.badge, styles.badgeContact]}>
            <Text style={styles.badgeText}>Contato OK</Text>
          </View>
        )}
        {item.acceptedJesus && (
          <View style={[styles.badge, styles.badgeJesus]}>
            <Text style={styles.badgeText}>Aceitou Jesus</Text>
          </View>
        )}
        {item.congregates && (
          <View style={[styles.badge, styles.badgeChurch]}>
            <Text style={styles.badgeText}>
              Congreg{item.churchName ? `: ${item.churchName}` : 'a'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Gradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
        style={styles.header}
      >
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Controle de visitantes</Text>
            <Text style={styles.headerSub}>
              Presenças registradas sem conta
            </Text>
          </View>
        </SafeAreaView>
      </Gradient>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome ou evento..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, selectedEventId && styles.filterBtnActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={20} color={selectedEventId ? '#fff' : COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          {selectedEventId && ' neste evento'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Users size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>
                Nenhum visitante registrado ainda
              </Text>
              <Text style={styles.emptySub}>
                Para gerar o QR do evento e compartilhar o link com visitantes, volte à tela anterior (Controle de Presença) e toque no botão "Registrar visitante".
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <UserPlus size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Voltar e abrir Registrar visitante</Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={[COLORS.primary]}
            />
          }
        />
      )}

      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar por evento</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={styles.modalClose}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[styles.modalOption, !selectedEventId && styles.modalOptionActive]}
                onPress={() => {
                  setSelectedEventId(null);
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, !selectedEventId && styles.modalOptionTextActive]}>
                  Todos os eventos
                </Text>
              </TouchableOpacity>
              {events.map((ev) => (
                <TouchableOpacity
                  key={ev.id}
                  style={[
                    styles.modalOption,
                    selectedEventId === ev.id && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedEventId(ev.id);
                    setShowFilterModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedEventId === ev.id && styles.modalOptionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {ev.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingVertical: SPACING.LG, paddingHorizontal: SPACING.LG },
  headerSafe: { flexDirection: 'row', alignItems: 'center', gap: SPACING.MD },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: { ...TYPOGRAPHY.h2, color: '#fff', marginBottom: 2 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: SPACING.SM },
  searchInput: { flex: 1, height: 44, fontSize: 16, color: COLORS.text },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: COLORS.primary },
  statsRow: { paddingHorizontal: SPACING.LG, marginBottom: SPACING.SM },
  statsText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  listContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.XS },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { ...TYPOGRAPHY.h4, color: COLORS.text },
  deleteBtn: { padding: 4 },
  cardEvent: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 4 },
  cardPhone: { ...TYPOGRAPHY.bodySmall, color: COLORS.text, marginBottom: 4, fontWeight: '500' },
  cardMeta: { flexDirection: 'row', gap: 12, marginBottom: SPACING.SM },
  cardDate: { fontSize: 13, color: COLORS.textSecondary },
  cardTime: { fontSize: 13, color: COLORS.textSecondary },
  cardVisits: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BORDER_RADIUS.SM },
  badgeFirst: { backgroundColor: `${COLORS.info}20` },
  badgeContact: { backgroundColor: `${COLORS.success}20` },
  badgeJesus: { backgroundColor: `${COLORS.secondary}20` },
  badgeChurch: { backgroundColor: `${COLORS.spiritualOrange}20` },
  badgeText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  empty: {
    alignItems: 'center',
    paddingVertical: SPACING.XXL,
  },
  emptyText: { ...TYPOGRAPHY.h3, marginTop: SPACING.MD, marginBottom: SPACING.XS },
  emptySub: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: SPACING.LG, marginBottom: SPACING.LG },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.LG,
    borderRadius: BORDER_RADIUS.MD,
    ...SHADOWS.sm,
  },
  emptyButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    padding: SPACING.LG,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  modalTitle: { ...TYPOGRAPHY.h3 },
  modalClose: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  modalList: { maxHeight: 400 },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: 4,
    backgroundColor: COLORS.background,
  },
  modalOptionActive: { backgroundColor: `${COLORS.primary}15` },
  modalOptionText: { fontSize: 16, color: COLORS.text },
  modalOptionTextActive: { color: COLORS.primary, fontWeight: '600' },
});
