/**
 * Página pública (sem login) — visitante abre pelo link exclusivo /visit/:token.
 * Estilo “landing” alinhado ao tema do app; envio via RPC visitor_checkin_submit.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { CheckCircle, Heart, Users, Sparkles } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY } from '../../constants/theme';
import { previewVisitorCheckin, submitVisitorCheckin } from '../../services/supabase';
import { RootStackParamList } from '../../types/navigation';

type ScreenState = 'loading' | 'ready' | 'success' | 'error';

export default function VisitorOnboardingScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'VisitorOnboarding'>>();
  const token = route.params?.token?.trim() ?? '';

  const [state, setState] = useState<ScreenState>('loading');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [acceptedJesus, setAcceptedJesus] = useState<boolean | null>(null);
  const [congregates, setCongregates] = useState<boolean | null>(null);
  const [churchName, setChurchName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!token) {
      setState('error');
      return;
    }
    setState('loading');
    try {
      const res = await previewVisitorCheckin(token);
      if (!res.valid) {
        setState('error');
        return;
      }
      setEventTitle(res.event.title ?? 'Evento');
      setEventDate(res.event.date ?? null);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [token]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const canSubmit =
    name.trim().length > 0 && isFirstTime !== null && acceptedJesus !== null && congregates !== null;

  const handleSubmit = async () => {
    if (!canSubmit || !token) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitVisitorCheckin({
        token,
        name: name.trim(),
        isFirstTime: !!isFirstTime,
        phone: phone.trim() || null,
        acceptedJesus: !!acceptedJesus,
        congregates: !!congregates,
        churchName: congregates ? churchName.trim() : null,
      });
      setState('success');
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Não foi possível registrar. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  };

  const goAuth = () => (navigation as any).navigate('Auth');

  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.muted}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'error') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerPadded}>
          <Text style={styles.errorTitle}>Link inválido ou expirado</Text>
          <Text style={styles.mutedCenter}>Peça um novo QR ou link à recepção.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={goAuth}>
            <Text style={styles.primaryBtnText}>Ir ao início</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'success') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.successWrap} keyboardShouldPersistTaps="handled">
          <View style={styles.successIcon}>
            <CheckCircle size={72} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Presença confirmada!</Text>
          <Text style={styles.mutedCenter}>Ficamos felizes com a sua visita a &quot;{eventTitle}&quot;.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={goAuth}>
            <Text style={styles.primaryBtnText}>Fechar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const dateLabel = eventDate
    ? new Date(eventDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>Guest Jovem</Text>
          <Text style={styles.heroTitle}>Que bom que você veio!</Text>
          <Text style={styles.eventPill}>
            {eventTitle}
            {dateLabel ? ` · ${dateLabel}` : ''}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Heart size={22} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Um pouco sobre nós</Text>
          </View>
          <Text style={styles.bodyText}>
            Somos o ministério de jovens da igreja — um lugar para crescer na fé, nos relacionar de verdade e descobrir o propósito que Deus tem para a sua vida.
          </Text>
          <Text style={styles.bodyText}>
            Queremos te acolher com respeito e carinho. Suas respostas abaixo ajudam a equipe a cuidar melhor de você; informe só o que se sentir à vontade.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Sparkles size={22} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>Antes de confirmar sua presença</Text>
          </View>

          <Text style={styles.fieldLabel}>Nome *</Text>
          <TextInput
            style={styles.input}
            placeholder="Como você gostaria de ser chamado?"
            placeholderTextColor={COLORS.textLight}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.fieldLabel}>Telefone (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Para contato pastoral, se desejar"
            placeholderTextColor={COLORS.textLight}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>É sua primeira vez conosco? *</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggle, isFirstTime === true && styles.toggleOn]} onPress={() => setIsFirstTime(true)}>
              <Text style={[styles.toggleTxt, isFirstTime === true && styles.toggleTxtOn]}>Sim</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggle, isFirstTime === false && styles.toggleOn]} onPress={() => setIsFirstTime(false)}>
              <Text style={[styles.toggleTxt, isFirstTime === false && styles.toggleTxtOn]}>Não</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Já aceitou Jesus como seu Salvador? *</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggle, acceptedJesus === true && styles.toggleOn]} onPress={() => setAcceptedJesus(true)}>
              <Text style={[styles.toggleTxt, acceptedJesus === true && styles.toggleTxtOn]}>Sim</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggle, acceptedJesus === false && styles.toggleOn]} onPress={() => setAcceptedJesus(false)}>
              <Text style={[styles.toggleTxt, acceptedJesus === false && styles.toggleTxtOn]}>Não</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Congrega em alguma igreja? *</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggle, congregates === true && styles.toggleOn]} onPress={() => setCongregates(true)}>
              <Text style={[styles.toggleTxt, congregates === true && styles.toggleTxtOn]}>Sim</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggle, congregates === false && styles.toggleOn]} onPress={() => setCongregates(false)}>
              <Text style={[styles.toggleTxt, congregates === false && styles.toggleTxtOn]}>Não</Text>
            </TouchableOpacity>
          </View>

          {congregates === true && (
            <>
              <Text style={styles.fieldLabel}>Qual igreja?</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome da igreja"
                placeholderTextColor={COLORS.textLight}
                value={churchName}
                onChangeText={setChurchName}
              />
            </>
          )}
        </View>

        <View style={[styles.sectionCard, { alignItems: 'center' }]}>
          <Users size={24} color={COLORS.primary} style={{ marginBottom: 8 }} />
          <Text style={styles.footerNote}>
            Ao confirmar, você registra sua presença neste evento. Se tiver dúvidas, fale com alguém da recepção — estamos aqui por você.
          </Text>
          {submitError ? <Text style={styles.inlineError}>{submitError}</Text> : null}
          <TouchableOpacity
            style={[styles.primaryBtnWide, (!canSubmit || submitting) && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Confirmar presença</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={goAuth} style={styles.textLinkWrap}>
          <Text style={styles.textLink}>Voltar ao início do app</Text>
        </TouchableOpacity>

        {Platform.OS === 'web' ? <View style={{ height: SPACING.XL * 2 }} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  page: { paddingHorizontal: SPACING.LG, paddingBottom: SPACING.XL * 2, maxWidth: 560, width: '100%', alignSelf: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerPadded: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.XL },
  muted: { marginTop: 12, color: COLORS.textSecondary, ...TYPOGRAPHY.body },
  mutedCenter: { textAlign: 'center', color: COLORS.textSecondary, ...TYPOGRAPHY.body, marginBottom: SPACING.LG },
  hero: {
    paddingVertical: SPACING.XL,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.LG,
  },
  heroKicker: { ...TYPOGRAPHY.bodySmall, color: COLORS.primary, fontWeight: '700', marginBottom: SPACING.XS },
  heroTitle: { ...TYPOGRAPHY.h2, marginBottom: SPACING.SM },
  eventPill: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.SM, marginBottom: SPACING.MD },
  sectionTitle: { ...TYPOGRAPHY.h3, flex: 1 },
  inlineError: { ...TYPOGRAPHY.bodySmall, color: COLORS.error, textAlign: 'center', marginTop: SPACING.SM },
  bodyText: { ...TYPOGRAPHY.body, color: COLORS.text, marginBottom: SPACING.MD, lineHeight: 22 },
  fieldLabel: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 8, marginTop: SPACING.SM },
  input: {
    height: 50,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.MD,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  toggleRow: { flexDirection: 'row', gap: SPACING.SM, marginBottom: SPACING.SM },
  toggle: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  toggleOn: { backgroundColor: `${COLORS.primary}18`, borderColor: COLORS.primary },
  toggleTxt: { fontSize: 16, color: COLORS.text },
  toggleTxtOn: { color: COLORS.primary, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: SPACING.XL,
    borderRadius: BORDER_RADIUS.MD,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryBtnWide: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.MD,
    width: '100%',
    alignItems: 'center',
    marginTop: SPACING.MD,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },
  footerNote: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  textLinkWrap: { alignItems: 'center', marginTop: SPACING.MD, marginBottom: SPACING.LG },
  textLink: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  errorTitle: { ...TYPOGRAPHY.h3, color: COLORS.error, marginBottom: SPACING.SM, textAlign: 'center' },
  successWrap: { flexGrow: 1, padding: SPACING.XL, justifyContent: 'center', alignItems: 'center' },
  successIcon: { marginBottom: SPACING.LG },
  successTitle: { ...TYPOGRAPHY.h2, textAlign: 'center', marginBottom: SPACING.SM },
});
