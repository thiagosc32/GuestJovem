import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Animated,
  Platform,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Plus, CheckCircle, Lock, Globe, ArrowLeft, Edit2, Trash2, CheckCircle as CheckIcon } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import PrayerCard, { PrayerCardProps } from '../../components/PrayerCard';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, globalStyles, SHADOWS } from '../../constants/theme';
import {
  supabase,
  getPrayerRequests,
  createPrayerRequest,
  getPrayedRequestIds,
  togglePray,
  getMyPrayerRequests,
  updatePrayerRequest,
  deletePrayerRequest,
  markPrayerAnswered,
  notifyAdminsOfPrivatePrayerRequest,
} from '../../services/supabase';
import { PrayerRequest } from '../../types/models';

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
    isPrivate: !row.is_public,
    isAnswered: row.is_answered ?? false,
    prayerCount: row.prayer_count ?? 0,
    createdAt: row.created_at,
    testimony: row.testimony ?? undefined,
    leadershipMessage: row.leadership_message ?? undefined,
    commentsCount: row.comments_count ?? 0,
  };
}

type TabType = 'feed' | 'mine';

export default function PrayerRequestScreen() {
  const navigation = useNavigation();
  const [tab, setTab] = useState<TabType>('feed');
  const [filter, setFilter] = useState<'all' | 'active' | 'answered'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [myRequests, setMyRequests] = useState<PrayerRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PrayerRequest | null>(null);
  const [markAnsweredRequest, setMarkAnsweredRequest] = useState<PrayerRequest | null>(null);
  const [testimonyText, setTestimonyText] = useState('');
  const [newRequest, setNewRequest] = useState<{
    title: string;
    description: string;
    isPrivate: boolean;
    category: PrayerRequest['category'];
  }>({
    title: '',
    description: '',
    isPrivate: false,
    category: 'personal',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prayedIds, setPrayedIds] = useState<Set<string>>(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  const loadPrayedIds = useCallback(async (userId: string) => {
    try {
      const ids = await getPrayedRequestIds(userId);
      setPrayedIds(new Set(ids));
    } catch (_) {
      setPrayedIds(new Set());
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPrayerRequests(50, 0);
      const list = Array.isArray(data) ? data.map(mapRowToPrayerRequest) : [];
      setRequests(list);
    } catch (err) {
      console.error('Erro ao carregar pedidos de oração:', err);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMyRequests = useCallback(async (userId: string, userName: string) => {
    try {
      const data = await getMyPrayerRequests(userId);
      const list = (data ?? []).map((row: any) => {
        const user = row.users ?? {};
        const name = (user && typeof user === 'object' && 'name' in user) ? (user as any).name : userName;
        return {
          id: row.id,
          userId: row.user_id,
          userName: name || userName,
          userAvatar: (user as any)?.avatar_url ?? undefined,
          title: row.title,
          description: row.description,
          category: row.category,
          isPrivate: !row.is_public,
          isAnswered: row.is_answered ?? false,
          prayerCount: row.prayer_count ?? 0,
          createdAt: row.created_at,
        testimony: row.testimony ?? undefined,
        leadershipMessage: row.leadership_message ?? undefined,
        commentsCount: row.comments_count ?? 0,
        };
      });
      setMyRequests(list);
    } catch (err) {
      console.error('Erro ao carregar meus pedidos:', err);
      setMyRequests([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;
        setCurrentUserId(user.id);
        const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).single();
        const name = (profile as any)?.name ?? 'Eu';
        setCurrentUserName(name);
        await loadPrayedIds(user.id);
        await loadRequests();
        await loadMyRequests(user.id, name);
      })();
      return () => { mounted = false; };
    }, [loadPrayedIds, loadRequests, loadMyRequests])
  );

  useEffect(() => {
    if (Platform.OS === 'web') {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }
  }, []);

  const baseList = tab === 'mine' ? myRequests : requests;
  const filteredRequests = baseList.filter((request) => {
    if (tab === 'mine') {
      if (visibilityFilter === 'public' && request.isPrivate) return false;
      if (visibilityFilter === 'private' && !request.isPrivate) return false;
    }
    if (filter === 'active') return !request.isAnswered;
    if (filter === 'answered') return request.isAnswered;
    return true;
  });

  const handleSubmitRequest = async () => {
    if (!newRequest.title.trim() || !newRequest.description.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha título e descrição.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erro', 'Faça login para enviar um pedido de oração.');
        return;
      }
      const created = await createPrayerRequest({
        user_id: user.id,
        title: newRequest.title.trim(),
        description: newRequest.description.trim(),
        category: newRequest.category,
        is_public: !newRequest.isPrivate,
        is_answered: false,
        prayer_count: 0,
      });
      if (newRequest.isPrivate && (created as any)?.id) {
        try {
          await notifyAdminsOfPrivatePrayerRequest((created as any).id, newRequest.title.trim());
        } catch (_) {}
      }
      setShowNewRequestModal(false);
      setNewRequest({ title: '', description: '', isPrivate: false, category: 'personal' });
      await loadRequests();
      if (currentUserId) await loadMyRequests(currentUserId, currentUserName);
      Alert.alert('Sucesso', newRequest.isPrivate ? 'Pedido privado enviado. Os líderes foram notificados.' : 'Pedido de oração enviado. Se for público, ele aparecerá no feed.');
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Não foi possível enviar o pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePray = useCallback(
    async (requestId: string) => {
      if (!currentUserId) return;
      try {
        const { hasPrayed, newCount } = await togglePray(requestId, currentUserId);
        setPrayedIds((prev) => {
          const next = new Set(prev);
          if (hasPrayed) next.add(requestId);
          else next.delete(requestId);
          return next;
        });
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, prayerCount: newCount } : r))
        );
        setMyRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, prayerCount: newCount } : r))
        );
      } catch (_) {}
    },
    [currentUserId]
  );

  const handleEditRequest = (req: PrayerRequest) => {
    setEditingRequest(req);
    setNewRequest({
      title: req.title,
      description: req.description,
      isPrivate: req.isPrivate,
      category: req.category,
    });
  };

  const handleSaveEditRequest = async () => {
    if (!editingRequest || !newRequest.title.trim() || !newRequest.description.trim()) return;
    setIsSubmitting(true);
    try {
      await updatePrayerRequest(editingRequest.id, {
        title: newRequest.title.trim(),
        description: newRequest.description.trim(),
        category: newRequest.category,
        is_public: !newRequest.isPrivate,
      });
      setEditingRequest(null);
      setNewRequest({ title: '', description: '', isPrivate: false, category: 'personal' });
      if (currentUserId) {
        await loadRequests();
        await loadMyRequests(currentUserId, currentUserName);
      }
      Alert.alert('Sucesso', 'Pedido atualizado.');
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Não foi possível atualizar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = (req: PrayerRequest) => {
    Alert.alert(
      'Excluir pedido',
      `Excluir "${req.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const id = req.id;
            setMyRequests((prev) => prev.filter((r) => r.id !== id));
            setRequests((prev) => prev.filter((r) => r.id !== id));
            setEditingRequest(null);
            setMarkAnsweredRequest(null);
            try {
              await deletePrayerRequest(id);
              if (currentUserId) {
                await loadRequests();
                await loadMyRequests(currentUserId, currentUserName);
              }
              Alert.alert('Sucesso', 'Pedido excluído.');
            } catch (e: any) {
              if (currentUserId) {
                await loadRequests();
                await loadMyRequests(currentUserId, currentUserName);
              }
              Alert.alert('Erro', e.message ?? 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  const handleCommentAdded = useCallback((requestId: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, commentsCount: (r.commentsCount ?? 0) + 1 } : r))
    );
    setMyRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, commentsCount: (r.commentsCount ?? 0) + 1 } : r))
    );
  }, []);

  const handleCommentDeleted = useCallback((requestId: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, commentsCount: Math.max(0, (r.commentsCount ?? 0) - 1) } : r))
    );
    setMyRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, commentsCount: Math.max(0, (r.commentsCount ?? 0) - 1) } : r))
    );
  }, []);

  const handleMarkAnswered = async () => {
    if (!markAnsweredRequest || !testimonyText.trim()) return;
    setIsSubmitting(true);
    try {
      await markPrayerAnswered(markAnsweredRequest.id, testimonyText.trim());
      setMarkAnsweredRequest(null);
      setTestimonyText('');
      if (currentUserId) {
        await loadRequests();
        await loadMyRequests(currentUserId, currentUserName);
      }
      Alert.alert('Sucesso', 'Pedido marcado como respondido.');
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Não foi possível salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ContentWrapper = Platform.OS === 'web' ? View : Animated.View;
  const containerStyle =
    Platform.OS === 'web'
      ? [styles.container, isVisible && styles.visible]
      : [styles.container, { opacity: fadeAnim }];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        }}
      >
        <ContentWrapper style={containerStyle}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Pedidos de Oração</Text>
              <Text style={styles.headerSubtitle}>Orem uns pelos outros</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => { setEditingRequest(null); setShowNewRequestModal(true); }}>
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabChip, tab === 'feed' && styles.tabChipActive]}
              onPress={() => setTab('feed')}
            >
              <Text style={[styles.tabText, tab === 'feed' && styles.tabTextActive]}>Feed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabChip, tab === 'mine' && styles.tabChipActive]}
              onPress={() => setTab('mine')}
            >
              <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>Meus pedidos</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'active' && styles.filterChipActive]}
              onPress={() => setFilter('active')}
            >
              <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>Ativos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'answered' && styles.filterChipActive]}
              onPress={() => setFilter('answered')}
            >
              <CheckCircle size={16} color={filter === 'answered' ? '#fff' : COLORS.success} />
              <Text style={[styles.filterText, filter === 'answered' && styles.filterTextActive]}>Respondidos</Text>
            </TouchableOpacity>
          </View>
          {tab === 'mine' && (
            <View style={[styles.filterContainer, { marginTop: 0, marginBottom: SPACING.MD }]}>
              <TouchableOpacity
                style={[styles.filterChip, visibilityFilter === 'all' && styles.filterChipActive]}
                onPress={() => setVisibilityFilter('all')}
              >
                <Text style={[styles.filterText, visibilityFilter === 'all' && styles.filterTextActive]}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, visibilityFilter === 'public' && styles.filterChipActive]}
                onPress={() => setVisibilityFilter('public')}
              >
                <Globe size={14} color={visibilityFilter === 'public' ? '#fff' : COLORS.text} />
                <Text style={[styles.filterText, visibilityFilter === 'public' && styles.filterTextActive]}>Público</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, visibilityFilter === 'private' && styles.filterChipActive]}
                onPress={() => setVisibilityFilter('private')}
              >
                <Lock size={14} color={visibilityFilter === 'private' ? '#fff' : COLORS.text} />
                <Text style={[styles.filterText, visibilityFilter === 'private' && styles.filterTextActive]}>Privado</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.emptySubtext}>Carregando pedidos...</Text>
              </View>
            ) : filteredRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Heart size={64} color={COLORS.textLight} />
                <Text style={styles.emptyText}>Nenhum pedido de oração encontrado</Text>
                <Text style={styles.emptySubtext}>
                  {tab === 'mine'
                    ? 'Você ainda não criou pedidos de oração'
                    : filter === 'all'
                    ? 'Seja o primeiro a compartilhar uma necessidade'
                    : 'Nenhum pedido neste filtro'}
                </Text>
              </View>
            ) : (
              filteredRequests.map((request) => (
                <View key={request.id} style={tab === 'mine' ? styles.myRequestCardWrap : undefined}>
                  <PrayerCard
                    request={request}
                    hasPrayed={prayedIds.has(request.id)}
                    onPray={tab === 'feed' ? handlePray : undefined}
                    onCommentAdded={handleCommentAdded}
                    onCommentDeleted={handleCommentDeleted}
                  />
                  {tab === 'mine' && (
                    <View style={styles.myRequestActions}>
                      {!request.isAnswered && (
                        <TouchableOpacity
                          style={styles.myRequestActionBtn}
                          onPress={() => handleEditRequest(request)}
                        >
                          <Edit2 size={18} color={COLORS.primary} />
                          <Text style={styles.myRequestActionText}>Editar</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.myRequestActionBtn}
                        onPress={() => handleDeleteRequest(request)}
                      >
                        <Trash2 size={18} color={COLORS.error} />
                        <Text style={[styles.myRequestActionText, { color: COLORS.error }]}>Excluir</Text>
                      </TouchableOpacity>
                      {!request.isAnswered && !request.isPrivate && (
                        <TouchableOpacity
                          style={styles.myRequestActionBtn}
                          onPress={() => { setMarkAnsweredRequest(request); setTestimonyText(request.testimony ?? ''); }}
                        >
                          <CheckIcon size={18} color={COLORS.success} />
                          <Text style={[styles.myRequestActionText, { color: COLORS.success }]}>Marcar respondido</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </ContentWrapper>

        <Modal visible={showNewRequestModal || !!editingRequest} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{editingRequest ? 'Editar Pedido' : 'Novo Pedido de Oração'}</Text>
                  <TouchableOpacity onPress={() => { setShowNewRequestModal(false); setEditingRequest(null); setNewRequest({ title: '', description: '', isPrivate: false, category: 'personal' }); }}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <Text style={styles.inputLabel}>Título</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Título breve para seu pedido"
                    placeholderTextColor={COLORS.textSecondary}
                    value={newRequest.title}
                    onChangeText={(text) => setNewRequest({ ...newRequest, title: text })}
                  />

                  <Text style={styles.inputLabel}>Descrição</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Compartilhe sua necessidade de oração..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={newRequest.description}
                    onChangeText={(text) => setNewRequest({ ...newRequest, description: text })}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  <Text style={styles.inputLabel}>Categoria</Text>
                  <View style={styles.categoryGrid}>
                    {['personal', 'family', 'health', 'spiritual', 'other'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryChip, newRequest.category === cat && styles.categoryChipActive]}
                        onPress={() => setNewRequest({ ...newRequest, category: cat as any })}
                      >
                        <Text
                          style={[styles.categoryChipText, newRequest.category === cat && styles.categoryChipTextActive]}
                        >
                          {cat === 'personal' && 'Pessoal'}
                          {cat === 'family' && 'Família'}
                          {cat === 'health' && 'Saúde'}
                          {cat === 'spiritual' && 'Espiritual'}
                          {cat === 'other' && 'Outro'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.privacyToggle}
                    onPress={() => setNewRequest({ ...newRequest, isPrivate: !newRequest.isPrivate })}
                  >
                    <View style={styles.privacyInfo}>
                      {newRequest.isPrivate ? (
                        <Lock size={20} color={COLORS.textSecondary} />
                      ) : (
                        <Globe size={20} color={COLORS.textSecondary} />
                      )}
                      <Text style={styles.privacyText}>
                        {newRequest.isPrivate ? 'Privado (Apenas líderes)' : 'Público (Todos)'}
                      </Text>
                    </View>
                    <View style={[styles.toggleSwitch, newRequest.isPrivate && styles.toggleSwitchActive]}>
                      <View style={[styles.toggleThumb, newRequest.isPrivate && styles.toggleThumbActive]} />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!newRequest.title.trim() || !newRequest.description.trim() || isSubmitting) &&
                        styles.submitButtonDisabled,
                    ]}
                    onPress={editingRequest ? handleSaveEditRequest : handleSubmitRequest}
                    disabled={!newRequest.title.trim() || !newRequest.description.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>{editingRequest ? 'Salvar alterações' : 'Enviar Pedido de Oração'}</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={!!markAnsweredRequest} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Marcar como respondido</Text>
                  <TouchableOpacity onPress={() => { setMarkAnsweredRequest(null); setTestimonyText(''); }}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 24 }}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.inputLabel}>Testemunho (como Deus respondeu)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Compartilhe como sua oração foi respondida..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={testimonyText}
                    onChangeText={setTestimonyText}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.submitButton, (!testimonyText.trim() || isSubmitting) && styles.submitButtonDisabled]}
                    onPress={handleMarkAnswered}
                    disabled={!testimonyText.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Salvar</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      opacity: 0,
      transition: 'opacity 0.4s ease-out',
    }),
  },
  visible: { opacity: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerContent: { flex: 1, marginLeft: SPACING.SM },
  headerTitle: { ...TYPOGRAPHY.h3 },
  headerSubtitle: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.LG,
    marginBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.XS,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.text },
  filterTextActive: { color: '#fff' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: SPACING.LG, marginBottom: SPACING.MD, gap: SPACING.SM },
  tabChip: { flex: 1, paddingVertical: SPACING.SM, borderRadius: BORDER_RADIUS.MD, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  tabChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.text },
  tabTextActive: { color: '#fff' },
  myRequestCardWrap: { marginBottom: SPACING.MD },
  myRequestActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.SM, marginTop: SPACING.SM, marginBottom: SPACING.LG, paddingHorizontal: SPACING.XS },
  myRequestActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: BORDER_RADIUS.MD, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  myRequestActionText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.LG },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.XXL },
  emptyText: { ...TYPOGRAPHY.h3, marginTop: SPACING.MD, marginBottom: SPACING.XS },
  emptySubtext: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: BORDER_RADIUS.LG,
    borderTopRightRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  modalTitle: { ...TYPOGRAPHY.h3 },
  modalClose: { fontSize: 24, color: COLORS.textSecondary },
  inputLabel: { ...TYPOGRAPHY.body, fontWeight: '600', marginBottom: SPACING.SM },
  input: { ...globalStyles.input, marginBottom: SPACING.MD },
  textArea: { height: 100, paddingTop: SPACING.MD },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.SM, marginBottom: SPACING.MD },
  categoryChip: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  categoryChipText: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.text },
  categoryChipTextActive: { color: '#fff' },
  privacyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MD,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.LG,
  },
  privacyInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.SM, flex: 1 },
  privacyText: { ...TYPOGRAPHY.bodySmall },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: { backgroundColor: COLORS.success },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  submitButton: { ...globalStyles.button, backgroundColor: COLORS.primary },
  submitButtonDisabled: { backgroundColor: COLORS.border },
  submitButtonText: { ...globalStyles.buttonText },
});
