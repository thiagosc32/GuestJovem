/**
 * Admin: Gerenciar definições de conquistas.
 * O admin pode criar, editar e excluir conquistas, selecionando ícone de uma lista.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Award, Pencil, Trash2, X } from 'lucide-react-native';
import {
  Flame,
  BookOpen,
  BookMarked,
  Calendar,
  PenLine,
  MessageCircle,
  ListChecks,
  Heart,
  Star,
  Sparkles,
  Target,
  Gem,
  Shield,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Gradient from '../../components/ui/Gradient';
import {
  getAchievementDefinitions,
  createAchievementDefinition,
  updateAchievementDefinition,
  deleteAchievementDefinition,
  ACHIEVEMENT_ICONS,
  PROGRESS_KEYS,
  type AchievementDefinition,
} from '../../services/achievementsService';

const BADGE_ICONS: Record<string, React.ComponentType<{ color: string; size: number }>> = {
  flame: Flame,
  book: BookOpen,
  'book-open': BookMarked,
  dove: Award,
  calendar: Calendar,
  'pen-line': PenLine,
  'message-circle': MessageCircle,
  'list-checks': ListChecks,
  heart: Heart,
  award: Award,
  star: Star,
  sparkles: Sparkles,
  target: Target,
  gem: Gem,
  shield: Shield,
};

export default function AdminAchievementsScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<any>();
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AchievementDefinition | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    icon: 'flame',
    progress_key: 'prayer_streak',
    max_progress: 1,
    sort_order: 0,
  });

  const loadDefinitions = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAchievementDefinitions();
      setDefinitions(list);
    } catch (e) {
      console.error('AdminAchievements load', e);
      setDefinitions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadDefinitions(); }, [loadDefinitions]));

  const openCreate = () => {
    setEditing(null);
    setForm({ title: '', description: '', icon: 'flame', progress_key: 'prayer_streak', max_progress: 1, sort_order: definitions.length });
    setShowModal(true);
  };

  const openEdit = (def: AchievementDefinition) => {
    setEditing(def);
    setForm({
      title: def.title,
      description: def.description,
      icon: def.icon,
      progress_key: def.progress_key,
      max_progress: def.max_progress,
      sort_order: def.sort_order,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert('Atenção', 'Preencha título e descrição.');
      return;
    }
    if (form.max_progress < 1) {
      Alert.alert('Atenção', 'Progresso máximo deve ser pelo menos 1.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateAchievementDefinition(editing.id, form);
        Alert.alert('Sucesso', 'Conquista atualizada.');
      } else {
        await createAchievementDefinition(form);
        Alert.alert('Sucesso', 'Conquista criada.');
      }
      setShowModal(false);
      loadDefinitions();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (def: AchievementDefinition) => {
    Alert.alert(
      'Excluir conquista',
      `Deseja excluir "${def.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAchievementDefinition(def.id);
              loadDefinitions();
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Gradient colors={[theme.gradientStart, theme.gradientMiddle]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowLeft size={24} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Conquistas</Text>
        <Text style={styles.subtitle}>Crie e gerencie as conquistas exibidas aos usuários</Text>
      </Gradient>

      <TouchableOpacity style={styles.addButton} onPress={openCreate} activeOpacity={0.9}>
        <Plus size={20} color="#fff" />
        <Text style={styles.addButtonText}>Nova conquista</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {definitions.map((def) => {
            const IconComp = BADGE_ICONS[def.icon] ?? Award;
            return (
              <View key={def.id} style={styles.card}>
                <View style={styles.cardIcon}>
                  <IconComp size={32} color={COLORS.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{def.title}</Text>
                  <Text style={styles.cardDesc}>{def.description}</Text>
                  <Text style={styles.cardMeta}>
                    {PROGRESS_KEYS.find((p) => p.id === def.progress_key)?.label ?? def.progress_key} • Meta: {def.max_progress}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(def)}>
                    <Pencil size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(def)}>
                    <Trash2 size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {definitions.length === 0 && (
            <View style={styles.empty}>
              <Award size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Nenhuma conquista configurada</Text>
              <Text style={styles.emptySub}>Toque em "Nova conquista" para criar</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editing ? 'Editar conquista' : 'Nova conquista'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Título</Text>
                <TextInput
                  style={styles.input}
                  value={form.title}
                  onChangeText={(t) => setForm({ ...form, title: t })}
                  placeholder="Ex: 7 dias de oração"
                  placeholderTextColor={COLORS.textSecondary}
                />

                <Text style={styles.inputLabel}>Descrição</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.description}
                  onChangeText={(t) => setForm({ ...form, description: t })}
                  placeholder="Ex: Orou consecutivos por 7 dias"
                  placeholderTextColor={COLORS.textSecondary}
                  multiline
                />

                <Text style={styles.inputLabel}>Ícone</Text>
                <View style={styles.iconGrid}>
                  {ACHIEVEMENT_ICONS.map((ic) => {
                    const IconComp = BADGE_ICONS[ic.id] ?? Award;
                    const selected = form.icon === ic.id;
                    return (
                      <TouchableOpacity
                        key={ic.id}
                        style={[styles.iconOption, selected && styles.iconOptionSelected]}
                        onPress={() => setForm({ ...form, icon: ic.id })}
                      >
                        <IconComp size={24} color={selected ? '#fff' : COLORS.text} />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.inputLabel}>Chave de progresso</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.progressKeyRow}>
                  {PROGRESS_KEYS.map((pk) => (
                    <TouchableOpacity
                      key={pk.id}
                      style={[styles.chip, form.progress_key === pk.id && styles.chipSelected]}
                      onPress={() => setForm({ ...form, progress_key: pk.id })}
                    >
                      <Text style={[styles.chipText, form.progress_key === pk.id && styles.chipTextSelected]} numberOfLines={1}>{pk.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Meta (valor para desbloquear)</Text>
                <TextInput
                  style={styles.input}
                  value={String(form.max_progress)}
                  onChangeText={(t) => setForm({ ...form, max_progress: parseInt(t, 10) || 1 })}
                  placeholder="Ex: 7"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="number-pad"
                />

                <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editing ? 'Salvar' : 'Criar'}</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: SPACING.LG, paddingBottom: SPACING.XL, paddingHorizontal: SPACING.LG },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  title: { ...TYPOGRAPHY.h1, color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, marginHorizontal: SPACING.LG, marginVertical: SPACING.MD, paddingVertical: 14, borderRadius: BORDER_RADIUS.MD, ...SHADOWS.small },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.LG, padding: SPACING.MD, marginBottom: SPACING.MD, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  cardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: `${COLORS.primary}18`, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.MD },
  cardBody: { flex: 1 },
  cardTitle: { ...TYPOGRAPHY.body, fontWeight: '700', color: COLORS.text },
  cardDesc: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  cardMeta: { ...TYPOGRAPHY.caption, color: COLORS.primary, marginTop: 4, fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { padding: 8 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: 16 },
  emptySub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.LG, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.LG },
  modalTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  inputLabel: { ...TYPOGRAPHY.body, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.MD, padding: 12, fontSize: 16, color: COLORS.text, backgroundColor: COLORS.background },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  iconOption: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  iconOptionSelected: { backgroundColor: COLORS.primary },
  progressKeyRow: { marginVertical: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.border, marginRight: 8 },
  chipSelected: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  saveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: BORDER_RADIUS.MD, alignItems: 'center', marginTop: 24, marginBottom: 24 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
