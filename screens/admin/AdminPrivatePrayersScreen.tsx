import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getPrivatePrayerRequests, markPrivatePrayerAnswered } from '../../services/supabase';
import { PrayerRequest } from '../../types/models';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY } from '../../constants/theme';

function mapRowToPrayerRequest(row: any): PrayerRequest {
  const user = row.users ?? {};
  const name = typeof user === 'object' && user !== null && 'name' in user ? (user as any).name : 'Usuário';
  return {
    id: row.id,
    userId: row.user_id,
    userName: name || 'Usuário',
    userAvatar: (user as any)?.avatar_url,
    title: row.title,
    description: row.description,
    category: row.category,
    isPrivate: true,
    isAnswered: row.is_answered ?? false,
    prayerCount: row.prayer_count ?? 0,
    createdAt: row.created_at,
    testimony: row.testimony ?? undefined,
    leadershipMessage: row.leadership_message ?? undefined,
  };
}

export default function AdminPrivatePrayersScreen() {
  const navigation = useNavigation();
  const [list, setList] = useState<PrayerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [answeringRequest, setAnsweringRequest] = useState<PrayerRequest | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPrivatePrayerRequests();
      setList((data ?? []).map(mapRowToPrayerRequest));
    } catch (err) {
      console.error('Erro ao carregar pedidos privados:', err);
      setList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRespond = async () => {
    if (!answeringRequest) return;
    const msg = messageText.trim();
    if (!msg) {
      Alert.alert('Campo obrigatório', 'Digite a mensagem da liderança para o jovem.');
      return;
    }
    setIsSubmitting(true);
    try {
      await markPrivatePrayerAnswered(answeringRequest.id, msg, answeringRequest.userId);
      setAnsweringRequest(null);
      setMessageText('');
      await load();
      Alert.alert('Sucesso', 'Pedido marcado como respondido. O jovem verá a mensagem em "Meus pedidos".');
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Não foi possível salvar a resposta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pedidos privados</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Lock size={56} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Nenhum pedido privado</Text>
            <Text style={styles.emptySub}>Os pedidos enviados como privados aparecerão aqui.</Text>
          </View>
        ) : (
          list.map((request) => (
            <View key={request.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Lock size={18} color={COLORS.textSecondary} />
                <Text style={styles.cardAuthor}>{request.userName}</Text>
                {request.isAnswered && (
                  <View style={styles.answeredBadge}>
                    <CheckCircle size={14} color={COLORS.success} />
                    <Text style={styles.answeredText}>Respondido</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardTitle}>{request.title}</Text>
              <Text style={styles.cardDescription} numberOfLines={4}>{request.description}</Text>
              {request.leadershipMessage && (
                <View style={styles.testimonyBox}>
                  <Text style={styles.testimonyLabel}>Mensagem da liderança:</Text>
                  <Text style={styles.testimonyText}>{request.leadershipMessage}</Text>
                </View>
              )}
              {!request.isAnswered && (
                <TouchableOpacity
                  style={styles.respondBtn}
                  onPress={() => { setAnsweringRequest(request); setMessageText(request.leadershipMessage ?? ''); }}
                >
                  <CheckCircle size={18} color="#fff" />
                  <Text style={styles.respondBtnText}>Responder</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!answeringRequest} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKav}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Mensagem da liderança</Text>
              <Text style={styles.modalSub}>
                {answeringRequest?.title}
              </Text>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.inputLabel}>Mensagem para o jovem</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Digite a mensagem da liderança..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => { setAnsweringRequest(null); setMessageText(''); }}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, (!messageText.trim() || isSubmitting) && styles.saveBtnDisabled]}
                    onPress={handleRespond}
                    disabled={!messageText.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.saveBtnText}>Salvar resposta</Text>
                    )}
                  </TouchableOpacity>
                </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { ...TYPOGRAPHY.h2, color: COLORS.text },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.MD, paddingBottom: 32 },
  center: { paddingVertical: 48, alignItems: 'center' },
  loadingText: { marginTop: 8, color: COLORS.textSecondary },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginTop: 12 },
  emptySub: { color: COLORS.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardAuthor: { marginLeft: 6, color: COLORS.textSecondary, fontSize: 14 },
  answeredBadge: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  answeredText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
  cardTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: 6 },
  cardDescription: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 },
  testimonyBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  testimonyLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  testimonyText: { fontSize: 14, color: COLORS.text },
  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.SM,
    marginTop: 12,
  },
  respondBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  modalKav: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: { ...TYPOGRAPHY.h2, paddingHorizontal: SPACING.MD, paddingTop: SPACING.MD },
  modalSub: { fontSize: 14, color: COLORS.textSecondary, paddingHorizontal: SPACING.MD, marginTop: 4 },
  modalScrollContent: { padding: SPACING.MD, paddingBottom: 24 },
  inputLabel: { fontSize: 14, color: COLORS.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.SM, padding: 12, fontSize: 16 },
  textArea: { minHeight: 100 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: BORDER_RADIUS.SM, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.textSecondary },
  saveBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: BORDER_RADIUS.SM, backgroundColor: COLORS.success },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
