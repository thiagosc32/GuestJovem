/**
 * Check-in de visitante (Fluxo B)
 * Visitante escaneia QR do evento e preenche formulário rápido.
 * Sem conta, sem login — linguagem pastoral.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CheckCircle, ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY } from '../../constants/theme';
import { getEventById, createVisitorPresence } from '../../services/supabase';
import { RootStackParamList } from '../../types/navigation';

type ScreenState = 'form' | 'success' | 'error';

export default function VisitorCheckInScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'VisitorCheckIn'>>();
  const eventId = route.params?.eventId ?? '';
  const [event, setEvent] = useState<{ id: string; title: string; date?: string } | null>(null);
  const [name, setName] = useState('');
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [contactOptIn, setContactOptIn] = useState(false);
  const [loading, setLoading] = useState(!!eventId);
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<ScreenState>(eventId ? 'form' : 'error');

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    getEventById(eventId)
      .then((ev) => {
        if (!cancelled && ev) setEvent(ev);
        else if (!cancelled) setState('error');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [eventId]);

  const handleSubmit = async () => {
    if (isFirstTime === null) return;
    setSubmitting(true);
    try {
      await createVisitorPresence({
        eventId,
        name: name.trim() || undefined,
        isFirstTime,
        contactOptIn,
      });
      setState('success');
    } catch (e: any) {
      setState('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando evento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event || state === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Evento não encontrado</Text>
          <Text style={styles.errorSubtext}>Verifique se o link está correto.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => (navigation as any).navigate('Auth')}>
            <ArrowLeft size={20} color="#fff" />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle size={80} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Presença registrada!</Text>
          <Text style={styles.successSubtext}>
            Obrigado por estar conosco em "{event.title}".
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => (navigation as any).navigate('Auth')}>
            <ArrowLeft size={20} color="#fff" />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.headerBack} onPress={() => (navigation as any).navigate('Auth')}>
          <ArrowLeft size={24} color={COLORS.text} />
          <Text style={styles.headerBackText}>Voltar</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Registrar presença</Text>
        <Text style={styles.subtitle}>{event.title}</Text>

        <Text style={styles.label}>Seu nome (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Como prefere ser chamado?"
          placeholderTextColor={COLORS.textLight}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>É sua primeira vez conosco?</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, isFirstTime === true && styles.toggleBtnActive]}
            onPress={() => setIsFirstTime(true)}
          >
            <Text style={[styles.toggleText, isFirstTime === true && styles.toggleTextActive]}>Sim</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, isFirstTime === false && styles.toggleBtnActive]}
            onPress={() => setIsFirstTime(false)}
          >
            <Text style={[styles.toggleText, isFirstTime === false && styles.toggleTextActive]}>Não</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.checkboxRow, contactOptIn && styles.checkboxRowActive]}
          onPress={() => setContactOptIn(!contactOptIn)}
        >
          <View style={[styles.checkbox, contactOptIn && styles.checkboxActive]}>
            {contactOptIn && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Deseja receber informações do ministério?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, (submitting || isFirstTime === null) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || isFirstTime === null}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Registrar presença</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.LG },
  loadingText: { marginTop: 12, color: COLORS.textSecondary },
  scrollContent: { padding: SPACING.LG, paddingBottom: 48 },
  headerBack: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.LG, gap: 4 },
  headerBackText: { fontSize: 16, color: COLORS.text },
  title: { ...TYPOGRAPHY.h2, marginBottom: SPACING.XS },
  subtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: SPACING.XL },
  label: { ...TYPOGRAPHY.bodySmall, marginBottom: 8, color: COLORS.textSecondary },
  input: {
    height: 48,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.LG,
  },
  toggleRow: { flexDirection: 'row', gap: SPACING.SM, marginBottom: SPACING.LG },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: `${COLORS.primary}15`, borderColor: COLORS.primary },
  toggleText: { fontSize: 16, color: COLORS.text },
  toggleTextActive: { color: COLORS.primary, fontWeight: '600' },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.XL,
  },
  checkboxRowActive: { borderColor: COLORS.primary },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkboxLabel: { flex: 1, fontSize: 16, color: COLORS.text },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  successContainer: { flex: 1, padding: SPACING.LG, alignItems: 'center', justifyContent: 'center' },
  successIcon: { marginBottom: SPACING.LG },
  successTitle: { ...TYPOGRAPHY.h2, marginBottom: SPACING.SM, textAlign: 'center' },
  successSubtext: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.XL },
  errorTitle: { ...TYPOGRAPHY.h3, marginBottom: SPACING.SM, color: COLORS.error },
  errorSubtext: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginBottom: SPACING.LG },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.MD,
  },
  backButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
