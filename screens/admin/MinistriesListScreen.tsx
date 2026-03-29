/**
 * Gerenciamento dos Ministérios — lista de ministérios (Guest Fire, Organização, Criativo, Liderança, Mídia).
 * Agora permite que admins criem, editem e excluam ministérios dinamicamente.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ChevronRight, LayoutGrid, Plus, Edit3, Trash2, X, Check } from 'lucide-react-native';
import Gradient from '../../components/ui/Gradient';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { MINISTRY_KEYS, getMinistryLabel } from '../../constants/ministries';
import { getMinistries, createMinistry, updateMinistry, deleteMinistry, deleteMinistryByKey, type Ministry } from '../../services/ministries';

/** Opções de cores prontas para o ministério */
const MINISTRY_COLOR_OPTIONS = [
  COLORS.primary,
  '#10B981',
  '#8B5CF6',
  '#F59E0B',
  '#EC4899',
  '#06B6D4',
  '#22C55E',
  '#6366F1',
  '#EF4444',
  '#64748B',
  '#F97316',
  '#A855F7',
  '#14B8A6',
  '#EAB308',
];

const isLightHex = (hex: string) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  return y > 0.6;
};

const FALLBACK_COLORS: Record<string, string> = {
  guest_fire: COLORS.primary,
  organizacao: '#10B981',
  criativo: '#8B5CF6',
  lideranca: '#F59E0B',
  midia: '#EC4899',
};

export default function MinistriesListScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<any>();

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Ministry | null>(null);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const loadMinistries = async () => {
    try {
      setLoading(true);
      const list = await getMinistries();
      if (list.length === 0) {
        // Fallback para lista fixa se tabela ainda não tiver sido populada
        const fallback = MINISTRY_KEYS.map((key, idx) => ({
          id: key,
          ministry_key: key,
          name: getMinistryLabel(key),
          color: FALLBACK_COLORS[key] ?? COLORS.primary,
          is_active: true,
          sort_order: idx,
        })) as Ministry[];
        setMinistries(fallback);
      } else {
        setMinistries(list);
      }
    } catch (e) {
      const fallback = MINISTRY_KEYS.map((key, idx) => ({
        id: key,
        ministry_key: key,
        name: getMinistryLabel(key),
        color: FALLBACK_COLORS[key] ?? COLORS.primary,
        is_active: true,
        sort_order: idx,
      })) as Ministry[];
      setMinistries(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMinistries();
  }, []);

  const openCreateModal = () => {
    setEditing(null);
    setName('');
    setIdentifier('');
    setColor('');
    setModalVisible(true);
  };

  const openEditModal = (m: Ministry) => {
    setEditing(m);
    setName(m.name);
    setIdentifier(m.ministry_key);
    setColor(m.color ?? '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Campo obrigatório', 'Informe o nome do ministério.');
      return;
    }
    let key = identifier.trim();
    if (!key) {
      key = slugify(trimmedName);
    }
    setSaving(true);
    try {
      if (editing && editing.id && editing.id.length === 36) {
        const updated = await updateMinistry(editing.id, {
          ministry_key: key,
          name: trimmedName,
          color: color.trim() || null,
        });
        setMinistries((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      } else {
        const created = await createMinistry({
          ministry_key: key,
          name: trimmedName,
          color: color.trim() || null,
          sort_order: ministries.length,
        });
        setMinistries((prev) => [...prev, created]);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar o ministério.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (m: Ministry) => {
    Alert.alert(
      'Excluir ministério',
      `Excluir o ministério "${m.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const isUuid = m.id && m.id.length === 36 && /^[0-9a-f-]{36}$/i.test(m.id);
              if (isUuid) {
                await deleteMinistry(m.id);
              } else {
                await deleteMinistryByKey(m.ministry_key);
              }
              setMinistries((prev) => prev.filter((item) => item.id !== m.id && item.ministry_key !== m.ministry_key));
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível excluir o ministério.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Gradient colors={[theme.gradientStart, theme.gradientMiddle]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowLeft size={24} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Ministérios</Text>
          <Text style={styles.headerSubtitle}>Gerencie tarefas, agenda e membros</Text>
        </View>
        <TouchableOpacity style={styles.headerRightBtn} onPress={openCreateModal} activeOpacity={0.8}>
          <Plus size={22} color="#fff" />
        </TouchableOpacity>
      </Gradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : ministries.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum ministério cadastrado. Toque em + para adicionar.</Text>
        ) : (
          ministries.map((m) => {
            const colorValue = m.color || FALLBACK_COLORS[m.ministry_key] || COLORS.primary;
            return (
              <View key={m.id} style={styles.cardWrapper}>
                <TouchableOpacity
                  style={styles.cardMain}
                  onPress={() =>
                    navigation.navigate('MinistryDetail', {
                      ministryKey: m.ministry_key,
                      ministryName: m.name,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${colorValue}18` }]}>
                    <LayoutGrid size={24} color={colorValue} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{m.name}</Text>
                    <Text style={styles.cardSubtitle}>{m.ministry_key}</Text>
                  </View>
                  <ChevronRight size={22} color={COLORS.textLight} />
                </TouchableOpacity>
                <View style={styles.cardDivider} />
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.cardBtnEdit} onPress={() => openEditModal(m)} activeOpacity={0.8}>
                    <Edit3 size={16} color={COLORS.primary} strokeWidth={2} />
                    <Text style={styles.cardBtnEditText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cardBtnDelete} onPress={() => handleDelete(m)} activeOpacity={0.8}>
                    <Trash2 size={16} color={COLORS.error} strokeWidth={2} />
                    <Text style={styles.cardBtnDeleteText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Editar ministério' : 'Novo ministério'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={12}>
                <X size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Nome do ministério *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Acolhimento, Guest Fire Teens"
                placeholderTextColor={COLORS.textLight}
                value={name}
                onChangeText={setName}
              />
              <Text style={styles.inputLabel}>Identificador interno</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: guest_fire, acolhimento"
                placeholderTextColor={COLORS.textLight}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Cor</Text>
              <View style={styles.colorRow}>
                {MINISTRY_COLOR_OPTIONS.map((hex) => {
                  const isSelected = (color || '').toLowerCase() === hex.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={hex}
                      style={[
                        styles.colorOption,
                        { backgroundColor: hex },
                        isSelected && styles.colorOptionSelected,
                      ]}
                      onPress={() => setColor(isSelected ? '' : hex)}
                      activeOpacity={0.8}
                    >
                      {isSelected && (
                        <Check size={18} color={isLightHex(hex) ? '#333' : '#fff'} strokeWidth={3} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {color ? (
                <TouchableOpacity style={styles.colorClearBtn} onPress={() => setColor('')}>
                  <Text style={styles.colorClearText}>Remover cor</Text>
                </TouchableOpacity>
              ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...TYPOGRAPHY.h2, color: '#fff', textAlign: 'center' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  headerRightBtn: { width: 40, alignItems: 'flex-end' },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: SPACING.MD },
  cardWrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  cardBody: { flex: 1 },
  cardTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  cardSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.LG,
  },
  cardActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    gap: SPACING.SM,
  },
  cardBtnEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.primary + '12',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  cardBtnEditText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  cardBtnDelete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.error + '12',
    borderWidth: 1,
    borderColor: COLORS.error + '40',
  },
  cardBtnDeleteText: { fontSize: 14, fontWeight: '600', color: COLORS.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: SPACING.LG },
  modalBox: { width: '100%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.LG, padding: SPACING.LG, ...SHADOWS.medium },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.MD },
  modalTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  modalContent: { },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.MD,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.SM,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderColor: COLORS.text,
  },
  colorClearBtn: { alignSelf: 'flex-start', marginBottom: SPACING.MD },
  colorClearText: { fontSize: 13, color: COLORS.textSecondary, textDecorationLine: 'underline' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.MD, padding: 14, alignItems: 'center', marginTop: SPACING.SM },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
