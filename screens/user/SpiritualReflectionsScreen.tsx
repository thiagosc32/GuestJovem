/**
 * Reflexões Espirituais
 * Lista de reflexões do usuário e botão para escrever nova. Cabeçalho no padrão da Jornada Espiritual.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PenLine, ArrowLeft, Sparkles } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Gradient from '../../components/ui/Gradient';
import { getReflections, createReflection } from '../../services/spiritualJourney';
import { completeDiscipline } from '../../services/spiritualDisciplines';
import { getCurrentUser } from '../../services/supabase';
import { XP_BY_ACTION, GROWTH_UNIT_LABEL } from '../../constants/spiritualJourney';

export default function SpiritualReflectionsScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<any>();
  const [reflections, setReflections] = useState<{ id: string; content: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [saving, setSaving] = useState(false);

  const loadReflections = useCallback(async () => {
    const user = await getCurrentUser();
    const userId = (user as any)?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const data = await getReflections(userId, 50);
      setReflections(data);
    } catch (e) {
      console.error('SpiritualReflectionsScreen loadReflections', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReflections();
    }, [loadReflections])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReflections();
  }, [loadReflections]);

  const handleSaveReflection = async () => {
    const trimmed = reflectionText.trim();
    if (!trimmed) {
      Alert.alert('Escreva algo', 'Digite sua reflexão antes de salvar.');
      return;
    }
    const user = await getCurrentUser();
    const userId = (user as any)?.id;
    if (!userId) return;

    setSaving(true);
    try {
      const { xpAwarded } = await createReflection(userId, trimmed);
      try {
        await completeDiscipline(userId, 'reflection_week');
      } catch (_) {}
      setModalVisible(false);
      setReflectionText('');
      await loadReflections();
      if (xpAwarded > 0) {
        Alert.alert('Reflexão salva!', `+${xpAwarded} ${GROWTH_UNIT_LABEL}. Continue cultivando sua jornada.`);
      } else {
        Alert.alert('Reflexão salva!', 'Você já registrou uma reflexão hoje. Amanhã você pode registrar de novo.');
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Gradient
        colors={[theme.gradientStart, theme.gradientMiddle]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (navigation as any).navigate('UserDashboard')}
          activeOpacity={0.8}
        >
          <ArrowLeft size={24} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reflexões Espirituais</Text>
        <Text style={styles.headerSubtitle}>
          O que Deus tem falado ao seu coração? Suas reflexões ficam aqui.
        </Text>
      </Gradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.writeRow}>
          <TouchableOpacity
            style={styles.writeButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <PenLine size={20} color="#fff" />
            <Text style={styles.writeButtonText}>Nova reflexão</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>1x por dia vale +{XP_BY_ACTION.reflection} {GROWTH_UNIT_LABEL} na jornada.</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        ) : reflections.length === 0 ? (
          <View style={styles.emptyState}>
            <Sparkles size={48} color={COLORS.spiritualGold} />
            <Text style={styles.emptyTitle}>Nenhuma reflexão ainda</Text>
            <Text style={styles.emptySubtitle}>
              Toque em "Nova reflexão" para escrever o que Deus tem falado ao seu coração.
            </Text>
          </View>
        ) : (
          <View style={styles.reflectionList}>
            {reflections.map((r) => (
              <View key={r.id} style={styles.reflectionCard}>
                <Text style={styles.reflectionContent}>{r.content}</Text>
                <Text style={styles.reflectionDate}>
                  {new Date(r.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova reflexão</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setReflectionText('');
                }}
              >
                <Text style={styles.modalClose}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>
              O que Deus tem falado ao seu coração? (1x por dia, +{XP_BY_ACTION.reflection} {GROWTH_UNIT_LABEL})
            </Text>
            <TextInput
              style={styles.reflectionInput}
              placeholder="Escreva sua reflexão..."
              placeholderTextColor={COLORS.textSecondary}
              value={reflectionText}
              onChangeText={setReflectionText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.submitButton, saving && styles.submitButtonDisabled]}
              onPress={handleSaveReflection}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Salvar reflexão</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.XL,
    paddingHorizontal: SPACING.LG,
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  headerTitle: { ...TYPOGRAPHY.h1, color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: SPACING.MD },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  writeRow: { marginBottom: SPACING.SM },
  writeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.LG,
    borderRadius: BORDER_RADIUS.MD,
  },
  writeButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  hint: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: SPACING.LG },
  centered: { paddingVertical: 48, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: COLORS.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: 16, textAlign: 'center' },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  reflectionList: { gap: 12 },
  reflectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    ...SHADOWS.small,
  },
  reflectionContent: { ...TYPOGRAPHY.body, color: COLORS.text, marginBottom: 8 },
  reflectionDate: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.LG,
    paddingBottom: SPACING.XXL + 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  modalClose: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  modalHint: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 12 },
  reflectionInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    minHeight: 120,
    marginBottom: SPACING.LG,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
