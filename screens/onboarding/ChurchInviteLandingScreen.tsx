/**
 * Link público /convite/:code — guarda código e encaminha ao login/cadastro.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Church } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY } from '../../constants/theme';
import { PENDING_CHURCH_INVITE_KEY } from '../../constants/tenantInvite';
import { previewChurchInvite, supabase, getCurrentUser } from '../../services/supabase';
import { RootStackParamList } from '../../types/navigation';
import { useChurchBranding } from '../../contexts/ChurchBrandingContext';
import { mapAppRole } from '../AuthScreen';

function replaceWebPathRoot() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.history.replaceState(null, '', '/');
    } catch (_) {}
  }
}

export default function ChurchInviteLandingScreen() {
  const navigation = useNavigation();
  const { refresh: refreshBranding } = useChurchBranding();
  const route = useRoute<RouteProp<RootStackParamList, 'ChurchInvite'>>();
  const code = route.params?.code?.trim() ?? '';
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ministryName, setMinistryName] = useState('');
  const [ministrySlogan, setMinistrySlogan] = useState('');
  const [churchName, setChurchName] = useState('');

  const load = useCallback(async () => {
    if (!code) {
      setInvalid(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await previewChurchInvite(code);
      if (!res.valid || !res.church) {
        setInvalid(true);
        return;
      }
      setMinistryName(res.church.ministry_name);
      setMinistrySlogan(res.church.ministry_slogan ?? '');
      setChurchName(res.church.name);
      await AsyncStorage.setItem(PENDING_CHURCH_INVITE_KEY, code);
    } catch {
      setInvalid(true);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  const goToAuth = useCallback(() => {
    replaceWebPathRoot();
    navigation.dispatch(CommonActions.navigate({ name: 'Auth' }));
  }, [navigation]);

  const resetToHomeForRole = useCallback(async () => {
    const profile = await getCurrentUser();
    const role = mapAppRole(profile as { role?: string } | null);
    const name =
      role === 'super_admin' ? 'SuperAdmin' : role === 'admin' ? 'AdminTabs' : 'UserTabs';
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name }] }));
  }, [navigation]);

  const goContinue = useCallback(async () => {
    if (!code || busy) return;
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      goToAuth();
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('claim_church_invite_for_current_user', {
        p_code: code,
      });
      if (error) throw error;
      const payload = data as { success?: boolean; error?: string; noop?: boolean };
      if (!payload?.success) {
        const err = payload?.error;
        if (err === 'invalid_invite') {
          Alert.alert('Convite', 'Este convite já não é válido.');
        } else if (err === 'super_admin') {
          Alert.alert(
            'Convite',
            'Contas super admin não são associadas a uma igreja por convite. Use uma conta de utilizador ou saia e registe-se com o link.'
          );
        } else if (err === 'already_assigned') {
          Alert.alert(
            'Convite',
            'Esta conta não pode usar este convite: é admin de outra igreja ou o convite não se aplica ao seu perfil. Utilize uma conta de participante ou saia e crie conta pelo link.'
          );
        } else {
          Alert.alert(
            'Convite',
            'Não foi possível associar este convite à sua conta. Tente outra conta ou saia e registe-se com o link.'
          );
        }
        return;
      }
      await AsyncStorage.removeItem(PENDING_CHURCH_INVITE_KEY);
      await refreshBranding();
      replaceWebPathRoot();
      await resetToHomeForRole();
      if (payload.noop) {
        setTimeout(() => Alert.alert('Convite', 'A sua conta já está nesta igreja.'), 300);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao aplicar o convite.';
      Alert.alert('Erro', msg);
    } finally {
      setBusy(false);
    }
  }, [code, busy, goToAuth, refreshBranding, resetToHomeForRole]);

  const goStartInvalid = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      replaceWebPathRoot();
      await resetToHomeForRole();
    } else {
      goToAuth();
    }
  }, [goToAuth, resetToHomeForRole]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.muted}>Validando convite...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (invalid) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerPadded}>
          <Text style={styles.title}>Convite inválido</Text>
          <Text style={styles.mutedCenter}>Peça um novo link à sua liderança.</Text>
          <TouchableOpacity style={styles.btn} onPress={goStartInvalid} disabled={busy}>
            <Text style={styles.btnText}>Ir ao início</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Church size={48} color={COLORS.primary} style={{ marginBottom: SPACING.SM }} />
          <Text style={styles.kicker}>Convite Guest Jovem</Text>
          <Text style={styles.heroTitle}>{ministryName}</Text>
          <Text style={styles.sub}>{ministrySlogan.trim() || churchName}</Text>
        </View>
        <Text style={styles.body}>
          Você foi convidado a participar do app nesta igreja. Toque abaixo para entrar ou criar conta — usaremos este convite ao registrar.
        </Text>
        <TouchableOpacity
          style={[styles.btn, busy && styles.btnDisabled]}
          onPress={goContinue}
          activeOpacity={0.9}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Continuar</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.LG },
  centerPadded: { flex: 1, justifyContent: 'center', padding: SPACING.LG },
  page: { padding: SPACING.XL, paddingBottom: SPACING.XXL },
  hero: { marginBottom: SPACING.LG },
  kicker: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 4 },
  heroTitle: { ...TYPOGRAPHY.h2, color: COLORS.text },
  sub: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: 4 },
  title: { ...TYPOGRAPHY.h3, color: COLORS.error, marginBottom: 8 },
  body: { ...TYPOGRAPHY.body, color: COLORS.text, marginBottom: SPACING.LG },
  muted: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: SPACING.SM },
  mutedCenter: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.LG },
  btn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.85 },
});
