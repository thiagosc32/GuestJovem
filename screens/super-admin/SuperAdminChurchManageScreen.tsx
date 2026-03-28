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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY } from '../../constants/theme';
import { RootStackParamList } from '../../types/navigation';
import {
  superAdminGetChurchAdmins,
  superAdminRemoveChurchAdmin,
  superAdminClearChurchAdminSlots,
  superAdminAssignChurchAdmin,
  superAdminSetChurchStatus,
  superAdminAddChurchInvite,
  getPublicWebBaseUrl,
} from '../../services/supabase';

type AdminRow = { id: string; email: string | null; name: string | null };

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

export default function SuperAdminChurchManageScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'SuperAdminChurchManage'>>();
  const {
    churchId,
    churchName,
    ministryName,
    status,
    userCount,
    slug,
    primaryInviteCode,
    activeInviteCount,
  } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [editEmail, setEditEmail] = useState('');
  const [assigning, setAssigning] = useState(false);

  const code = primaryInviteCode?.trim() || '';
  const inviteUrl = code ? churchInvitePublicUrl(code) : '';
  const nActive = typeof activeInviteCount === 'number' ? activeInviteCount : null;

  const loadAdmins = useCallback(async () => {
    try {
      const res = (await superAdminGetChurchAdmins(churchId)) as {
        success?: boolean;
        admins?: AdminRow[];
        pending_admin_emails?: string[];
      };
      if (res?.success) {
        setAdmins(Array.isArray(res.admins) ? res.admins : []);
        setPendingEmails(Array.isArray(res.pending_admin_emails) ? res.pending_admin_emails : []);
      } else {
        setAdmins([]);
        setPendingEmails([]);
      }
    } catch {
      setAdmins([]);
      setPendingEmails([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [churchId]);

  React.useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAdmins();
  };

  const showAdminDetails = () => {
    const lines: string[] = [];
    admins.forEach((a) => {
      lines.push(`• ${a.name || '—'}\n  ${a.email || '—'}\n  ID: ${a.id}`);
    });
    if (pendingEmails.length) {
      lines.push('\nPendente (registo ainda não feito):');
      pendingEmails.forEach((e) => lines.push(`• ${e}`));
    }
    if (!lines.length) {
      lines.push('Nenhum administrador definido.');
    }
    Alert.alert('Detalhes — administrador(es)', lines.join('\n'));
  };

  const assignAdmin = async () => {
    const e = editEmail.trim();
    if (!e || !e.includes('@')) {
      Alert.alert('E-mail', 'Indique um e-mail válido.');
      return;
    }
    setAssigning(true);
    try {
      const res = (await superAdminAssignChurchAdmin(churchId, e)) as {
        success?: boolean;
        error?: string;
        admin_linked?: boolean;
        admin_pending?: boolean;
      };
      if (!res?.success) {
        if (res?.error === 'super_admin_email') {
          Alert.alert('Não permitido', 'Este e-mail pertence a um super admin.');
        } else if (res?.error === 'invalid_email') {
          Alert.alert('E-mail inválido', '');
        } else {
          Alert.alert('Erro', res?.error ?? 'Falha ao guardar.');
        }
        return;
      }
      setEditEmail('');
      await loadAdmins();
      if (res.admin_linked) {
        Alert.alert('OK', 'Conta existente definida como administrador desta igreja.');
      } else if (res.admin_pending) {
        Alert.alert('OK', 'Quando criar conta com esse e-mail, entrará como admin desta igreja.');
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? '');
    } finally {
      setAssigning(false);
    }
  };

  const removeOneAdmin = (row: AdminRow) => {
    Alert.alert(
      'Remover papel de admin',
      `${row.email ?? row.id}\n\nO utilizador mantém-se na igreja como participante (user).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = (await superAdminRemoveChurchAdmin(churchId, row.id)) as { success?: boolean };
              if (!res?.success) throw new Error('Falha');
              await loadAdmins();
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? '');
            }
          },
        },
      ]
    );
  };

  const clearAllAdmins = () => {
    Alert.alert(
      'Remover todos os admins',
      'Todos os administradores desta igreja passam a user. Convites pendentes de admin para esta igreja são anulados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover todos',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = (await superAdminClearChurchAdminSlots(churchId)) as { success?: boolean };
              if (!res?.success) throw new Error('Falha');
              await loadAdmins();
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? '');
            }
          },
        },
      ]
    );
  };

  const toggleSuspend = () => {
    const next = status === 'suspended' ? 'active' : 'suspended';
    Alert.alert('Confirmar', `${next === 'suspended' ? 'Suspender' : 'Reativar'} ${churchName}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => {
          try {
            await superAdminSetChurchStatus(churchId, next);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Erro', e?.message ?? '');
          }
        },
      },
    ]);
  };

  const addChurchInvite = () => {
    Alert.alert(
      'Novo convite',
      `Gera um novo código para "${ministryName}".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar',
          onPress: async () => {
            try {
              const res = await superAdminAddChurchInvite(churchId, null);
              if (!(res as any)?.success) throw new Error((res as any)?.error ?? 'Falha');
              const newCode = (res as any)?.invite_code ?? '';
              const url = newCode ? churchInvitePublicUrl(newCode) : '';
              Alert.alert(
                'Convite criado',
                newCode ? `Código: ${newCode}\n\n${url}` : 'OK',
                url ? [{ text: 'Copiar link', onPress: () => void copyOrShareUrl(url) }, { text: 'Fechar' }] : undefined
              );
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? '');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <ArrowLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={2}>
          Gerir igreja
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.hero}>{ministryName}</Text>
        <Text style={styles.heroSub}>{churchName}</Text>
        <Text style={styles.meta}>
          {status} · {userCount} utilizadores
          {nActive !== null ? ` · ${nActive} convite(s) ativo(s)` : ''}
        </Text>
        {slug ? <Text style={styles.meta}>slug: {slug}</Text> : null}

        <Text style={styles.section}>Convite (entrada na igreja)</Text>
        {inviteUrl ? (
          <>
            <Text style={styles.inviteUrl} selectable>
              {inviteUrl}
            </Text>
            <Text style={styles.meta}>Código: {code}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => void copyOrShareUrl(inviteUrl)}>
                <Text style={styles.btnPrimaryTxt}>Copiar link</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnOutline} onPress={addChurchInvite}>
                <Text style={styles.btnOutlineTxt}>Novo convite</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={styles.muted}>Sem convite ativo no card — use &quot;Novo convite&quot;.</Text>
        )}

        <Text style={styles.section}>Administrador da igreja</Text>
        <Text style={styles.hint}>
          Ver detalhes (e-mail, ID), alterar o e-mail do admin ou remover o papel de administrador. Remover não apaga a conta de login — só o papel admin.
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.MD }} />
        ) : (
          <>
            {admins.length === 0 && pendingEmails.length === 0 ? (
              <Text style={styles.muted}>Nenhum administrador atribuído.</Text>
            ) : null}
            {admins.map((a) => (
              <View key={a.id} style={styles.adminCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.adminName}>{a.name || '—'}</Text>
                  <Text style={styles.adminEmail}>{a.email || '—'}</Text>
                </View>
                <TouchableOpacity style={styles.btnDangerSm} onPress={() => removeOneAdmin(a)}>
                  <Text style={styles.btnDangerSmTxt}>Remover admin</Text>
                </TouchableOpacity>
              </View>
            ))}
            {pendingEmails.map((pe) => (
              <View key={pe} style={styles.pendingRow}>
                <Text style={styles.muted}>Pendente: {pe}</Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.adminActions}>
          <TouchableOpacity style={styles.btnOutline} onPress={showAdminDetails}>
            <Text style={styles.btnOutlineTxt}>Ver detalhes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnOutline, (admins.length === 0 && pendingEmails.length === 0) && styles.disabled]}
            onPress={clearAllAdmins}
            disabled={admins.length === 0 && pendingEmails.length === 0}
          >
            <Text style={styles.btnOutlineTxt}>Excluir admin(s)</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.section, { marginTop: SPACING.LG }]}>Editar / definir admin</Text>
        <Text style={styles.hint}>
          Os admins atuais perdem o papel; o novo e-mail (conta existente ou futuro registo) passa a ser o admin.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Novo e-mail do administrador"
          placeholderTextColor={COLORS.textLight}
          value={editEmail}
          onChangeText={setEditEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.btnPrimary, assigning && styles.disabled]}
          onPress={assignAdmin}
          disabled={assigning}
        >
          {assigning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryTxt}>Guardar novo admin</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.section, { marginTop: SPACING.XL }]}>Estado da igreja</Text>
        <TouchableOpacity style={styles.btnDangerOutline} onPress={toggleSuspend}>
          <Text style={styles.btnDangerOutlineTxt}>
            {status === 'suspended' ? 'Reativar igreja' : 'Suspender igreja'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.MD, gap: SPACING.SM },
  back: { padding: 4 },
  title: { ...TYPOGRAPHY.h3, color: COLORS.text, flex: 1 },
  content: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  hero: { ...TYPOGRAPHY.h2, color: COLORS.text },
  heroSub: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: 4 },
  meta: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: 6 },
  section: { ...TYPOGRAPHY.h4, color: COLORS.text, marginTop: SPACING.LG, marginBottom: SPACING.SM },
  hint: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.SM },
  muted: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  inviteUrl: { fontSize: 13, color: COLORS.primary, lineHeight: 18, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.SM },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    minWidth: 120,
  },
  btnPrimaryTxt: { color: '#fff', fontWeight: '600' },
  btnOutline: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    minWidth: 120,
  },
  btnOutlineTxt: { color: COLORS.primary, fontWeight: '600' },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    padding: SPACING.MD,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.SM,
  },
  adminName: { ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.text },
  adminEmail: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginTop: 2 },
  btnDangerSm: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.SM,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  btnDangerSmTxt: { color: COLORS.error, fontSize: 12, fontWeight: '600' },
  pendingRow: { marginBottom: SPACING.SM },
  adminActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.MD },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    padding: 12,
    marginBottom: SPACING.SM,
    color: COLORS.text,
  },
  btnDangerOutline: {
    marginTop: SPACING.SM,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: 'center',
  },
  btnDangerOutlineTxt: { color: COLORS.error, fontWeight: '600' },
  disabled: { opacity: 0.45 },
});
