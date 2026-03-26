/**
 * Criar ou editar tipo de escala (cronograma) e suas etapas.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react-native';
import Gradient from '../../components/ui/Gradient';
import DismissKeyboardView from '../../components/DismissKeyboardView';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY } from '../../constants/theme';
import {
  getScheduleTypes,
  getScheduleTypeSteps,
  createScheduleType,
  updateScheduleType,
} from '../../services/scheduleTypesService';
import { getStepsForScheduleType } from '../../constants/eventScheduleSteps';

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

type StepRow = { id?: string; step_type: string; label: string; description: string };

export default function ScheduleTypeFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scheduleTypeId = route.params?.scheduleTypeId as string | undefined;
  const defaultKey = route.params?.defaultKey as string | undefined;
  const defaultLabel = route.params?.defaultLabel as string | undefined;
  const isEdit = !!scheduleTypeId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [steps, setSteps] = useState<StepRow[]>([]);

  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          const list = await getScheduleTypes();
          const type = list.find((t) => t.id === scheduleTypeId);
          if (!type) {
            Alert.alert('Erro', 'Tipo não encontrado.');
            navigation.goBack();
            return;
          }
          setLabel(type.label);
          setKey(type.key);
          const stepList = await getScheduleTypeSteps(scheduleTypeId);
          setSteps(
            stepList.map((s) => ({
              id: s.id,
              step_type: s.step_type,
              label: s.label,
              description: s.description ?? '',
            }))
          );
        } catch (e) {
          Alert.alert('Erro', 'Não foi possível carregar.');
          navigation.goBack();
        } finally {
          setLoading(false);
        }
      })();
    } else {
      if (defaultKey || defaultLabel) {
        setKey(defaultKey ?? '');
        setLabel(defaultLabel ?? '');
        const stepsFromConstants = getStepsForScheduleType((defaultKey ?? 'culto') as any);
        setSteps(
          stepsFromConstants.map((s) => ({
            step_type: s.step_type,
            label: s.label,
            description: s.description ?? '',
          }))
        );
      } else {
        setSteps([{ step_type: '', label: '', description: '' }]);
      }
      setLoading(false);
    }
  }, [scheduleTypeId, isEdit, defaultKey, defaultLabel, navigation]);

  const addStep = () => {
    setSteps((prev) => [...prev, { step_type: '', label: '', description: '' }]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof StepRow, value: string) => {
    setSteps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'label' && !isEdit && !next[index].step_type) {
        next[index].step_type = slugify(value);
      }
      return next;
    });
  };

  const handleSave = async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      Alert.alert('Campo obrigatório', 'Informe o nome da escala.');
      return;
    }
    const trimmedKey = key.trim() || slugify(trimmedLabel);
    const validSteps = steps.filter((s) => s.label.trim());
    if (validSteps.length === 0) {
      Alert.alert('Campo obrigatório', 'Adicione ao menos uma etapa.');
      return;
    }
    for (const s of validSteps) {
      const st = (s.step_type || slugify(s.label)).trim().toLowerCase().replace(/\s+/g, '_');
      if (!st) {
        Alert.alert('Etapa inválida', 'Cada etapa precisa de um identificador (ou nome).');
        return;
      }
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateScheduleType(
          scheduleTypeId,
          { label: trimmedLabel },
          validSteps.map((s, i) => ({
            id: s.id,
            step_type: (s.step_type || slugify(s.label)).trim().toLowerCase().replace(/\s+/g, '_'),
            label: s.label.trim(),
            description: s.description.trim() || null,
            sort_order: i,
          }))
        );
      } else {
        await createScheduleType({
          key: trimmedKey,
          label: trimmedLabel,
          sort_order: 0,
          steps: validSteps.map((s, i) => ({
            step_type: (s.step_type || slugify(s.label)).trim().toLowerCase().replace(/\s+/g, '_'),
            label: s.label.trim(),
            description: s.description.trim() || null,
            sort_order: i,
          })),
        });
      }
      Alert.alert('Salvo', 'Alterações salvas.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Gradient colors={[COLORS.gradientStart, COLORS.gradientMiddle]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ArrowLeft size={24} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Editar escala' : 'Nova escala'}</Text>
        <View style={styles.headerRight} />
      </Gradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <DismissKeyboardView style={{ flex: 1 }}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.inputLabel}>Nome da escala *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Escala culto"
              placeholderTextColor={COLORS.textLight}
              value={label}
              onChangeText={setLabel}
            />
            <Text style={styles.inputLabel}>Chave (identificador único)</Text>
            <TextInput
              style={[styles.input, isEdit && styles.inputDisabled]}
              placeholder="Ex: culto (gerado automaticamente se vazio)"
              placeholderTextColor={COLORS.textLight}
              value={key}
              onChangeText={setKey}
              editable={!isEdit}
              autoCapitalize="none"
            />
            {isEdit && <Text style={styles.hint}>A chave não pode ser alterada na edição.</Text>}

            <View style={styles.stepsHeader}>
              <Text style={styles.sectionTitle}>Etapas</Text>
              <TouchableOpacity style={styles.addStepBtn} onPress={addStep}>
                <Plus size={18} color={COLORS.primary} />
                <Text style={styles.addStepBtnText}>Adicionar etapa</Text>
              </TouchableOpacity>
            </View>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepCard}>
                <View style={styles.stepCardHeader}>
                  <Text style={styles.stepCardTitle}>Etapa {index + 1}</Text>
                  {steps.length > 1 && (
                    <TouchableOpacity onPress={() => removeStep(index)} hitSlop={8}>
                      <Trash2 size={20} color={COLORS.textLight} />
                    </TouchableOpacity>
                  )}
                </View>
                {!isEdit && (
                  <>
                    <Text style={styles.inputLabel}>Identificador (step_type)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: abertura (ou deixe vazio para gerar do nome)"
                      placeholderTextColor={COLORS.textLight}
                      value={step.step_type}
                      onChangeText={(v) => updateStep(index, 'step_type', v)}
                      autoCapitalize="none"
                    />
                  </>
                )}
                {isEdit && (
                  <Text style={styles.inputLabel}>Identificador: {step.step_type}</Text>
                )}
                <Text style={styles.inputLabel}>Nome *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Abertura"
                  placeholderTextColor={COLORS.textLight}
                  value={step.label}
                  onChangeText={(v) => updateStep(index, 'label', v)}
                />
                <Text style={styles.inputLabel}>Descrição (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.inputArea]}
                  placeholder="Descrição da etapa"
                  placeholderTextColor={COLORS.textLight}
                  value={step.description}
                  onChangeText={(v) => updateStep(index, 'description', v)}
                  multiline
                  numberOfLines={2}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>{isEdit ? 'Salvar alterações' : 'Criar escala'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </DismissKeyboardView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { flex: 1, ...TYPOGRAPHY.h2, color: '#fff', textAlign: 'center' },
  headerRight: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
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
  inputDisabled: { backgroundColor: COLORS.background, color: COLORS.textSecondary },
  inputArea: { minHeight: 60 },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: -8, marginBottom: SPACING.MD },
  sectionTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: SPACING.SM },
  stepsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.LG, marginBottom: SPACING.MD },
  addStepBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addStepBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  stepCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.SM },
  stepCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.MD,
    padding: 14,
    alignItems: 'center',
    marginTop: SPACING.LG,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
