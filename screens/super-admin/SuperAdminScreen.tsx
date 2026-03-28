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
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY } from '../../constants/theme';
import {
  superAdminListChurches,
  superAdminCreateChurch,
  superAdminSetChurchStatus,
  superAdminSetTenantProvisioningMode,
  getTenantProvisioningMode,
  superAdminAddChurchInvite,
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

  React.useEffect(() => {
    load();
  }, [load]);

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
      const res = await superAdminCreateChurch(newName.trim(), newMinistry.trim(), inviteCode.trim() || null);
      if (!(res as any)?.success) {
        throw new Error((res as any)?.error ?? 'Falha');
      }
      const code = (res as any)?.invite_code ?? '';
      const url = code ? churchInvitePublicUrl(code) : '';
      setNewName('');
      setNewMinistry('');
      setInviteCode('');
      await load();
      Alert.alert(
        'Igreja criada',
        code
          ? `Convite gerado automaticamente.\nO mesmo link fica visível no card da igreja.\n\n${url}`
          : 'Igreja criada. Atualize a lista se o convite não aparecer.',
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

  const toggleSuspend = (row: ChurchRow) => {
    const next = row.status === 'suspended' ? 'active' : 'suspended';
    Alert.alert('Confirmar', `${next === 'suspended' ? 'Suspender' : 'Reativar'} ${row.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => {
          try {
            await superAdminSetChurchStatus(row.id, next);
            await load();
          } catch (e: any) {
            Alert.alert('Erro', e?.message ?? '');
          }
        },
      },
    ]);
  };

  const addChurchInvite = (row: ChurchRow) => {
    Alert.alert(
      'Novo convite',
      `Gera um novo código para "${row.ministry_name}". O link anterior continua válido se o convite antigo existir.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar',
          onPress: async () => {
            try {
              const res = await superAdminAddChurchInvite(row.id, null);
              if (!(res as any)?.success) throw new Error((res as any)?.error ?? 'Falha');
              const code = (res as any)?.invite_code ?? '';
              const url = code ? churchInvitePublicUrl(code) : '';
              Alert.alert(
                'Convite criado',
                code ? `Código: ${code}\n\n${url}` : 'OK',
                url ? [{ text: 'Copiar link', onPress: () => void copyOrShareUrl(url) }, { text: 'Fechar' }] : undefined
              );
              await load();
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? '');
            }
          },
        },
      ]
    );
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
          Ao criar, o sistema gera automaticamente um código de convite e o link público aparece no card desta igreja (e no alerta abaixo). O campo de código é só se quiseres definir um código próprio.
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
        <TouchableOpacity style={styles.primaryBtn} onPress={createChurch} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Criar igreja</Text>}
        </TouchableOpacity>

        <Text style={[styles.section, { marginTop: SPACING.LG }]}>Igrejas</Text>
        <Text style={styles.hint}>
          O link de convite usa /convite/&lt;código&gt;. Configure EXPO_PUBLIC_WEB_URL (ex.: https://guestjovem.com) em produção. O convite é criado automaticamente ao criar a igreja; o card mostra o link após aplicar a migração super_admin_church_invites no Supabase.
        </Text>
        {churches.map((c) => {
          const code = c.primary_invite_code?.trim() || '';
          const inviteUrl = code ? churchInvitePublicUrl(code) : '';
          const nActive = typeof c.active_invite_count === 'number' ? c.active_invite_count : null;
          return (
            <View key={c.id} style={styles.card}>
              <Text style={styles.cardTitle}>{c.ministry_name}</Text>
              <Text style={styles.cardSub}>{c.name}</Text>
              <Text style={styles.cardMeta}>
                {c.status} · {c.user_count} usuários
                {nActive !== null ? ` · ${nActive} convite(s) ativo(s)` : ''}
              </Text>
              {c.slug ? <Text style={styles.cardMeta}>slug: {c.slug}</Text> : null}

              <Text style={styles.manageLabel}>Convite (entrada na igreja)</Text>
              {inviteUrl ? (
                <>
                  <Text style={styles.inviteUrl} selectable>
                    {inviteUrl}
                  </Text>
                  <Text style={styles.cardMeta}>Código: {code}</Text>
                </>
              ) : (
                <Text style={styles.noInvite}>
                  Nenhum convite ativo. A igreja legado costumava existir antes dos convites — use “Novo convite” para gerar o link.
                </Text>
              )}

              <View style={styles.manageRow}>
                <TouchableOpacity
                  style={[styles.manageBtn, !inviteUrl && styles.manageBtnDisabled]}
                  onPress={() => inviteUrl && void copyOrShareUrl(inviteUrl)}
                  disabled={!inviteUrl}
                >
                  <Text style={styles.manageBtnTxt}>Copiar link</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.manageBtnSecondary} onPress={() => addChurchInvite(c)}>
                  <Text style={styles.manageBtnSecondaryTxt}>Novo convite</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.manageRow}>
                <TouchableOpacity
                  style={styles.manageBtnDanger}
                  onPress={() => toggleSuspend(c)}
                >
                  <Text style={styles.manageBtnDangerTxt}>
                    {c.status === 'suspended' ? 'Reativar igreja' : 'Suspender igreja'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
  manageLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.MD,
    marginBottom: 6,
  },
  inviteUrl: {
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 18,
  },
  noInvite: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginTop: 4 },
  manageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.SM },
  manageBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.MD,
  },
  manageBtnDisabled: { opacity: 0.45 },
  manageBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 13 },
  manageBtnSecondary: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.MD,
  },
  manageBtnSecondaryTxt: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  manageBtnDanger: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  manageBtnDangerTxt: { color: COLORS.error, fontWeight: '600', fontSize: 13 },
});
