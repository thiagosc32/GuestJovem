/**
 * Departamentos — lista idêntica à de Ministérios, para testes.
 * Usa os mesmos dados (tabela ministries). Se não ficar bom, remova e use só Ministérios.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ChevronRight, LayoutGrid, Plus, Edit3, Trash2, X, Check, Calendar, Users, ListOrdered } from 'lucide-react-native';
import Gradient from '../../components/ui/Gradient';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { MINISTRY_KEYS, getMinistryLabel, getMinistryPurpose } from '../../constants/ministries';
import { SCHEDULE_TYPES } from '../../constants/eventScheduleSteps';
import { getMinistries, createMinistry, updateMinistry, deleteMinistry, deleteMinistryByKey, type Ministry } from '../../services/ministries';
import { getMinistryMemberCounts, getUpcomingMinistryEventsByKey } from '../../services/supabase';

const MINISTRY_COLOR_OPTIONS = [
  COLORS.primary, '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4',
  '#22C55E', '#6366F1', '#EF4444', '#64748B', '#F97316', '#A855F7', '#14B8A6', '#EAB308',
];

const isLightHex = (hex: string) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 0.6;
};

const FALLBACK_COLORS: Record<string, string> = {
  guest_fire: COLORS.primary, organizacao: '#10B981', criativo: '#8B5CF6', lideranca: '#F59E0B', midia: '#EC4899',
};

const LIST_HORIZONTAL_MARGIN = SPACING.MD;

export default function DepartmentsListScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const sideMargin = Math.max(LIST_HORIZONTAL_MARGIN, insets.left, insets.right);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [upcomingEvents, setUpcomingEvents] = useState<Record<string, { event_date: string; title: string }[]>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Ministry | null>(null);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);

  const slugify = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  const loadMinistries = async () => {
    try {
      setLoading(true);
      const list = await getMinistries();
      if (list.length === 0) {
        setMinistries(MINISTRY_KEYS.map((key, idx) => ({
          id: key, ministry_key: key, name: getMinistryLabel(key), color: FALLBACK_COLORS[key] ?? COLORS.primary, is_active: true, sort_order: idx,
        })) as Ministry[]);
      } else {
        setMinistries(list);
      }
      const [counts, events] = await Promise.all([
        getMinistryMemberCounts(),
        getUpcomingMinistryEventsByKey(2),
      ]);
      setMemberCounts(counts);
      setUpcomingEvents(events);
    } catch (e) {
      setMinistries(MINISTRY_KEYS.map((key, idx) => ({
        id: key, ministry_key: key, name: getMinistryLabel(key), color: FALLBACK_COLORS[key] ?? COLORS.primary, is_active: true, sort_order: idx,
      })) as Ministry[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMinistries(); }, []);

  const openCreateModal = () => { setEditing(null); setName(''); setIdentifier(''); setColor(''); setModalVisible(true); };
  const openEditModal = (m: Ministry) => { setEditing(m); setName(m.name); setIdentifier(m.ministry_key); setColor(m.color ?? ''); setModalVisible(true); };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) { Alert.alert('Campo obrigatório', 'Informe o nome do departamento.'); return; }
    const key = identifier.trim() || slugify(trimmedName);
    setSaving(true);
    try {
      if (editing?.id && editing.id.length === 36) {
        const updated = await updateMinistry(editing.id, { ministry_key: key, name: trimmedName, color: color.trim() || null });
        setMinistries((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      } else {
        const created = await createMinistry({ ministry_key: key, name: trimmedName, color: color.trim() || null, sort_order: ministries.length });
        setMinistries((prev) => [...prev, created]);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (m: Ministry) => {
    Alert.alert('Excluir departamento', `Excluir "${m.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          const isUuid = m.id && m.id.length === 36 && /^[0-9a-f-]{36}$/i.test(m.id);
          if (isUuid) await deleteMinistry(m.id); else await deleteMinistryByKey(m.ministry_key);
          setMinistries((prev) => prev.filter((item) => item.id !== m.id && item.ministry_key !== m.ministry_key));
        } catch (e: any) {
          Alert.alert('Erro', e?.message ?? 'Não foi possível excluir.');
        }
      } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Gradient colors={[theme.gradientStart, theme.gradientMiddle]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowLeft size={24} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Departamentos</Text>
          <Text style={styles.headerSubtitle}>Gerencie tarefas, agenda e membros (teste)</Text>
        </View>
        <TouchableOpacity style={styles.headerRightBtn} onPress={openCreateModal} activeOpacity={0.8}>
          <Plus size={22} color="#fff" />
        </TouchableOpacity>
      </Gradient>

      <TouchableOpacity
        style={styles.typesOfScalesBtn}
        onPress={() => navigation.navigate('ScheduleTypesList')}
        activeOpacity={0.8}
      >
        <ListOrdered size={18} color={COLORS.primary} strokeWidth={2} />
        <Text style={styles.typesOfScalesBtnText}>Tipos de escalas</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.listInner, { paddingLeft: sideMargin, paddingRight: sideMargin }]}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : ministries.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum departamento cadastrado. Toque em + para adicionar.</Text>
        ) : (
          ministries.map((m) => {
            const colorValue = m.color || FALLBACK_COLORS[m.ministry_key] || COLORS.primary;
            return (
              <View key={m.id} style={styles.cardWrapper}>
                <View style={[styles.cardAccent, { backgroundColor: colorValue }]} />
                <TouchableOpacity
                  style={styles.cardMain}
                  onPress={() => navigation.navigate('DepartmentDetail', { ministryKey: m.ministry_key, ministryName: m.name })}
                  activeOpacity={0.92}
                >
                  <View style={styles.cardTop}>
                    <View style={[styles.iconWrap, { backgroundColor: `${colorValue}12`, borderColor: `${colorValue}35` }]}>
                      <LayoutGrid size={24} color={colorValue} strokeWidth={2} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{m.name}</Text>
                      <View style={styles.cardMeta}>
                        {(() => {
                          const purpose = getMinistryPurpose(m.ministry_key);
                          if (purpose) {
                            return (
                              <Text style={styles.cardPurpose}>{purpose}</Text>
                            );
                          }
                          return null;
                        })()}
                        <View style={styles.cardStats}>
                          <View style={styles.cardStat}>
                            <Users size={14} color="rgba(0,0,0,0.5)" />
                            <Text style={styles.cardStatText}>{memberCounts[m.ministry_key] ?? 0} membro{(memberCounts[m.ministry_key] ?? 0) !== 1 ? 's' : ''}</Text>
                          </View>
                          {(upcomingEvents[m.ministry_key]?.length ?? 0) > 0 && (
                            <View style={styles.cardStat}>
                              <Calendar size={14} color="rgba(0,0,0,0.5)" />
                              <Text style={styles.cardStatText} numberOfLines={1}>
                                {upcomingEvents[m.ministry_key].map((ev) => {
                                  const d = ev.event_date.split('-');
                                  return `${d[2]}/${d[1]} ${ev.title}`;
                                }).join(' · ')}
                              </Text>
                            </View>
                          )}
                        </View>
                        {m.default_schedule_type && (
                          <View style={[styles.cardBadge, { backgroundColor: `${colorValue}18` }]}>
                            <Text style={[styles.cardBadgeText, { color: colorValue }]} numberOfLines={1}>
                              {SCHEDULE_TYPES.find((t) => t.id === m.default_schedule_type)?.label?.replace('Escala ', '') ?? m.default_schedule_type}
                            </Text>
                          </View>
                        )}
                        {m.is_active === false && (
                          <View style={styles.cardBadgeInactive}>
                            <Text style={styles.cardBadgeInactiveText}>Inativo</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardBottom}>
                    <View style={styles.cardRight}>
                      <TouchableOpacity
                        style={[styles.cardIconBtn, styles.cardIconBtnEdit]}
                        onPress={(e) => { e.stopPropagation(); openEditModal(m); }}
                        activeOpacity={0.7}
                        hitSlop={6}
                      >
                        <Edit3 size={14} color={COLORS.primary} strokeWidth={2} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cardIconBtn, styles.cardIconBtnDelete]}
                        onPress={(e) => { e.stopPropagation(); handleDelete(m); }}
                        activeOpacity={0.7}
                        hitSlop={6}
                      >
                        <Trash2 size={14} color={COLORS.error} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                    <ChevronRight size={20} color="rgba(0,0,0,0.25)" style={styles.cardChevron} />
                  </View>
                </TouchableOpacity>
              </View>
            );
          })
        )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Editar departamento' : 'Novo departamento'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={12}><X size={22} color={COLORS.text} /></TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Nome do departamento *</Text>
              <TextInput style={styles.input} placeholder="Ex: Acolhimento, Mídia" placeholderTextColor={COLORS.textLight} value={name} onChangeText={setName} />
              <Text style={styles.inputLabel}>Identificador interno</Text>
              <TextInput style={styles.input} placeholder="Ex: guest_fire, midia" placeholderTextColor={COLORS.textLight} value={identifier} onChangeText={setIdentifier} autoCapitalize="none" />
              <Text style={styles.inputLabel}>Cor</Text>
              <View style={styles.colorRow}>
                {MINISTRY_COLOR_OPTIONS.map((hex) => {
                  const isSelected = (color || '').toLowerCase() === hex.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={hex}
                      style={[styles.colorOption, { backgroundColor: hex }, isSelected && styles.colorOptionSelected]}
                      onPress={() => setColor(isSelected ? '' : hex)}
                      activeOpacity={0.8}
                    >
                      {isSelected && <Check size={18} color={isLightHex(hex) ? '#333' : '#fff'} strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {color ? <TouchableOpacity style={styles.colorClearBtn} onPress={() => setColor('')}><Text style={styles.colorClearText}>Remover cor</Text></TouchableOpacity> : null}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.MD, paddingTop: SPACING.MD, paddingBottom: SPACING.LG },
  backBtn: { padding: 8, marginRight: 8 },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...TYPOGRAPHY.h2, color: '#fff', textAlign: 'center' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  headerRightBtn: { width: 40, alignItems: 'flex-end' },
  typesOfScalesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  typesOfScalesBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: SPACING.LG, paddingBottom: SPACING.XXL, flexGrow: 1 },
  listInner: { width: '100%' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: SPACING.MD },
  cardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    aspectRatio: 1.35,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'column',
    paddingLeft: 4 + SPACING.LG + 8,
    paddingRight: 4 + SPACING.LG + 8,
    paddingTop: SPACING.MD + 4,
    paddingBottom: SPACING.MD,
  },
  cardTop: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 0,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  cardBody: { flex: 1, minWidth: 0, justifyContent: 'center', paddingVertical: 4 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.15,
    lineHeight: 22,
  },
  cardMeta: { marginTop: 8 },
  cardPurpose: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
    lineHeight: 18,
    marginBottom: 6,
  },
  cardStats: { gap: 4 },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardStatText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.55)',
    flex: 1,
  },
  cardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 120,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  cardBadgeText: { fontSize: 11, fontWeight: '600' },
  cardBadgeInactive: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  cardBadgeInactiveText: { fontSize: 11, fontWeight: '600', color: 'rgba(0,0,0,0.5)' },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconBtnEdit: {
    backgroundColor: COLORS.primary + '12',
    borderWidth: 1,
    borderColor: COLORS.primary + '28',
  },
  cardIconBtnDelete: {
    backgroundColor: COLORS.error + '0C',
    borderWidth: 1,
    borderColor: COLORS.error + '22',
  },
  cardChevron: { marginLeft: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.LG },
  modalBox: { width: '100%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.LG, padding: SPACING.LG, ...SHADOWS.medium },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.MD },
  modalTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  modalContent: {},
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.MD, padding: 12, fontSize: 16, color: COLORS.text, marginBottom: SPACING.MD },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.SM },
  colorOption: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  colorOptionSelected: { borderColor: COLORS.text },
  colorClearBtn: { alignSelf: 'flex-start', marginBottom: SPACING.MD },
  colorClearText: { fontSize: 13, color: COLORS.textSecondary, textDecorationLine: 'underline' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.MD, padding: 14, alignItems: 'center', marginTop: SPACING.SM },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
