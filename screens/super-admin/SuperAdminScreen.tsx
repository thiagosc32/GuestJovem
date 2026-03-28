import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY } from '../../constants/theme';
import {
  superAdminListChurches,
  superAdminCreateChurch,
  superAdminSetTenantProvisioningMode,
  getTenantProvisioningMode,
  getPublicWebBaseUrl,
} from '../../services/supabase';

type ChurchRow = {
  id: string;
  name: string;
  ministry_name: string;
  status: string;
  slug: string | null;
  created_at: string;
  user_count: number;
  primary_invite_code?: string | null;
  active_invite_count?: number;
};

function churchInvitePublicUrl(code: string): string {
  const base = getPublicWebBaseUrl().replace(/\/$/, '');
  return `${base}/convite/${encodeURIComponent(code)}`;
}

async function copyOrShareUrl(url: string): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      Alert.alert('Copiado', 'Link de convite copiado.');
      return;
    }
    await Share.share({ message: url, title: 'Convite Guest Jovem' });
  } catch {
    Alert.alert('Link de convite', url);
  }
}

export default function SuperAdminScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [churches, setChurches] = useState<ChurchRow[]>([]);
  const [mode, setMode] = useState<string>('both');
  const [newName, setNewName] = useState('');
  const [newMinistry, setNewMinistry] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, m] = await Promise.all([superAdminListChurches(), getTenantProvisioningMode()]);
      setMode(m);
      if (list && typeof list === 'object' && 'churches' in list && Array.isArray((list as any).churches)) {
        setChurches((list as any).churches as ChurchRow[]);
      } else {
        setChurches([]);
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível carregar.');
      setChurches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const setProvisioning = async (next: 'manual' | 'stripe' | 'both') => {
    try {
      await superAdminSetTenantProvisioningMode(next);
      setMode(next);
      Alert.alert('OK', 'Modo de provisão atualizado.');
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao salvar.');
    }
  };

  const createChurch = async () => {
    if (!newName.trim() || !newMinistry.trim()) {
      Alert.alert('Preencha', 'Nome da igreja e nome do ministério.');
      return;
    }
    setSaving(true);
    try {
      const adminEmailTrimmed = adminEmail.trim();
      const res = await superAdminCreateChurch(
        newName.trim(),
        newMinistry.trim(),
        inviteCode.trim() || null,
        adminEmailTrimmed || null
      );
      if (!(res as any)?.success) {
        throw new Error((res as any)?.error ?? 'Falha');
      }
      const code = (res as any)?.invite_code ?? '';
      const url = code ? churchInvitePublicUrl(code) : '';
      const linked = !!(res as any)?.admin_linked;
      const pending = !!(res as any)?.admin_pending;
      const adminNote = typeof (res as any)?.admin_note === 'string' ? (res as any).admin_note : '';
      setNewName('');
      setNewMinistry('');
      setInviteCode('');
      setAdminEmail('');
      await load();
      const adminLine = adminEmailTrimmed
        ? adminNote
          ? `\n\nAdmin: ${adminNote}`
          : linked
            ? '\n\nA conta do administrador já existia: foi definida como admin desta igreja.'
            : pending
              ? '\n\nQuando criar conta com o e-mail do administrador, entrará como admin desta igreja.'
              : ''
        : '';
      Alert.alert(
        'Igreja criada',
        (code
          ? `Convite gerado automaticamente.\nO mesmo link fica visível no card da igreja.\n\n${url}`
          : 'Igreja criada. Atualize a lista se o convite não aparecer.') + adminLine,
        url
          ? [
              { text: 'Copiar link', onPress: () => void copyOrShareUrl(url) },
              { text: 'OK' },
            ]
          : [{ text: 'OK' }]
      );
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível criar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <ArrowLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Super admin — igrejas</Text>
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.section}>Modo de provisão</Text>
        <Text style={styles.hint}>Atual: {mode}</Text>
        <View style={styles.row}>
          {(['manual', 'stripe', 'both'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, mode === m && styles.chipOn]}
              onPress={() => setProvisioning(m)}
            >
              <Text style={[styles.chipTxt, mode === m && styles.chipTxtOn]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Nova igreja</Text>
        <Text style={styles.hint}>
          Ao criar, o sistema gera automaticamente um código de convite e o link público aparece no card desta igreja (e no alerta abaixo). O campo de código é só se quiseres definir um código próprio. Opcionalmente indica o e-mail da conta que será administrador da igreja (se já existir, fica admin; se ainda não, ao registar com esse e-mail entra como admin).
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Nome da igreja"
          placeholderTextColor={COLORS.textLight}
          value={newName}
          onChangeText={setNewName}
        />
        <TextInput
          style={styles.input}
          placeholder="Nome do ministério (white-label)"
          placeholderTextColor={COLORS.textLight}
          value={newMinistry}
          onChangeText={setNewMinistry}
        />
        <TextInput
          style={styles.input}
          placeholder="Código do convite — opcional (vazio = gerado automaticamente)"
          placeholderTextColor={COLORS.textLight}
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="E-mail do administrador da igreja — opcional"
          placeholderTextColor={COLORS.textLight}
          value={adminEmail}
          onChangeText={setAdminEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={createChurch} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Criar igreja</Text>}
        </TouchableOpacity>

        <Text style={[styles.section, { marginTop: SPACING.LG }]}>Igrejas</Text>
        <Text style={styles.hint}>
          Toque num card para abrir convites, administrador (ver / editar / excluir) e suspender igreja. O link público usa /convite/&lt;código&gt; — configure EXPO_PUBLIC_WEB_URL em produção.
        </Text>
        {churches.map((c) => {
          const nActive = typeof c.active_invite_count === 'number' ? c.active_invite_count : null;
          return (
            <TouchableOpacity
              key={c.id}
              style={styles.card}
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate('SuperAdminChurchManage', {
                  churchId: c.id,
                  churchName: c.name,
                  ministryName: c.ministry_name,
                  status: c.status,
                  userCount: c.user_count,
                  slug: c.slug ?? '',
                  primaryInviteCode: c.primary_invite_code ?? '',
                  activeInviteCount: nActive ?? 0,
                })
              }
            >
              <Text style={styles.cardTitle}>{c.ministry_name}</Text>
              <Text style={styles.cardSub}>{c.name}</Text>
              <Text style={styles.cardMeta}>
                {c.status} · {c.user_count} usuários
                {nActive !== null ? ` · ${nActive} convite(s)` : ''}
              </Text>
              {c.slug ? <Text style={styles.cardMeta}>slug: {c.slug}</Text> : null}
              <Text style={styles.cardTapHint}>Toque para gerir →</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.MD, gap: SPACING.SM },
  back: { padding: 4 },
  title: { ...TYPOGRAPHY.h3, color: COLORS.text, flex: 1 },
  content: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  section: { ...TYPOGRAPHY.h4, color: COLORS.text, marginBottom: SPACING.SM },
  hint: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.SM },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.LG },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipOn: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  chipTxt: { color: COLORS.text, fontWeight: '600' },
  chipTxtOn: { color: COLORS.primary },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    padding: 12,
    marginBottom: SPACING.SM,
    color: COLORS.text,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  primaryTxt: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.SM,
  },
  cardTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  cardSub: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  cardMeta: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: 4 },
  cardTapHint: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: SPACING.SM,
  },
});
