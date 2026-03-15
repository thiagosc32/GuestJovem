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
import Gradient from '../../components/ui/Gradient';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, globalStyles, SHADOWS } from '../../constants/theme';
import { isFeatureAvailableForLevel, getLockedFeatureAlert } from '../../constants/featureGates';
import { getJourneySummary } from '../../services/spiritualJourney';
import {
  supabase,
  getPrayerRequests,
  createPrayerRequest,
  getPrayedRequestIds,
  togglePray,
  getPrayerRequestById,
  createNotification,
  getMyPrayerRequests,
  updatePrayerRequest,
  deletePrayerRequest,
  markPrayerAnswered,
  notifyAdminsOfPrivatePrayerRequest,
} from '../../services/supabase';
import { awardXp } from '../../services/spiritualJourney';
import { notifyAchievementUnlockIfNew } from '../../services/achievementsService';
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
  const [canRespondPrayer, setCanRespondPrayer] = useState(false);
  const [canInteractPrayer, setCanInteractPrayer] = useState(false);
  const [journeyLevel, setJourneyLevel] = useState(1);

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
        const summary = await getJourneySummary(user.id);
        const level = summary?.level ?? 1;
        if (mounted) {
          setJourneyLevel(level);
          setCanRespondPrayer(isFeatureAvailableForLevel('prayer_respond', level));
          setCanInteractPrayer(isFeatureAvailableForLevel('prayer_interact', level));
        }
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
      const createdId = (created as any)?.id;
      if (createdId) {
        try {
          await awardXp(user.id, 'prayer_register', { referenceId: createdId, referenceType: 'prayer_request' });
          notifyAchievementUnlockIfNew(user.id, 'prayer_streak').catch(() => {});
        } catch (_) {}
      }
      if (newRequest.isPrivate && createdId) {
        try {
          await notifyAdminsOfPrivatePrayerRequest(createdId, newRequest.title.trim());
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
        if (hasPrayed) {
          const req = await getPrayerRequestById(requestId);
          if (req && req.user_id !== currentUserId) {
            try {
              await createNotification({
                user_id: req.user_id,
                type: 'prayer',
                title: 'Alguém orou pelo seu pedido',
                message: 'Uma pessoa da comunidade orou pelo seu pedido de oração.',
                action_url: 'prayer_request:' + requestId,
              });
            } catch (_) {}
          }
        }
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.screen}>
        <ContentWrapper style={containerStyle}>
          <View style={styles.headerWrap}>
            <Gradient
              colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradientBg}
            />
            <TouchableOpacity style={styles.backBtn} onPress={() => (navigation as any).navigate('UserDashboard')} activeOpacity={0.8}>
              <ArrowLeft size={24} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pedidos de Oração</Text>
            <Text style={styles.headerSubtitle}>Orem uns pelos outros</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => { setEditingRequest(null); setShowNewRequestModal(true); }} activeOpacity={0.9}>
              <Plus size={24} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tabChip, tab === 'feed' && styles.tabChipActive]} onPress={() => setTab('feed')} activeOpacity={0.8}>
              <Text style={[styles.tabText, tab === 'feed' && styles.tabTextActive]}>Feed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabChip, tab === 'mine' && styles.tabChipActive]} onPress={() => setTab('mine')} activeOpacity={0.8}>
              <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>Meus pedidos</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity style={[styles.filterChip, filter === 'all' && styles.filterChipActive]} onPress={() => setFilter('all')} activeOpacity={0.8}>
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterChip, filter === 'active' && styles.filterChipActive]} onPress={() => setFilter('active')} activeOpacity={0.8}>
              <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>Ativos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterChip, filter === 'answered' && styles.filterChipActive]} onPress={() => setFilter('answered')} activeOpacity={0.8}>
              <CheckCircle size={16} color={filter === 'answered' ? '#fff' : COLORS.success} strokeWidth={2} />
              <Text style={[styles.filterText, filter === 'answered' && styles.filterTextActive]}>Respondidos</Text>
            </TouchableOpacity>
          </View>
          {tab === 'mine' && (
            <View style={styles.visibilityRow}>
              <TouchableOpacity style={[styles.filterChip, visibilityFilter === 'all' && styles.filterChipActive]} onPress={() => setVisibilityFilter('all')} activeOpacity={0.8}>
                <Text style={[styles.filterText, visibilityFilter === 'all' && styles.filterTextActive]}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, visibilityFilter === 'public' && styles.filterChipActive]} onPress={() => setVisibilityFilter('public')} activeOpacity={0.8}>
                <Globe size={14} color={visibilityFilter === 'public' ? '#fff' : COLORS.text} strokeWidth={2} />
                <Text style={[styles.filterText, visibilityFilter === 'public' && styles.filterTextActive]}>Público</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, visibilityFilter === 'private' && styles.filterChipActive]} onPress={() => setVisibilityFilter('private')} activeOpacity={0.8}>
                <Lock size={14} color={visibilityFilter === 'private' ? '#fff' : COLORS.text} strokeWidth={2} />
                <Text style={[styles.filterText, visibilityFilter === 'private' && styles.filterTextActive]}>Privado</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.emptySubtext}>Carregando pedidos...</Text>
              </View>
            ) : filteredRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Heart size={40} color={COLORS.primary} strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyText}>Nenhum pedido de oração</Text>
                <Text style={styles.emptySubtext}>
                  {tab === 'mine' ? 'Você ainda não criou pedidos' : filter === 'all' ? 'Seja o primeiro a compartilhar' : 'Nenhum pedido neste filtro'}
                </Text>
              </View>
            ) : (
              filteredRequests.map((request) => (
                <View key={request.id} style={tab === 'mine' ? styles.myRequestCardWrap : undefined}>
                  <PrayerCard
                    request={request}
                    hasPrayed={prayedIds.has(request.id)}
                    onPray={tab === 'feed' && canInteractPrayer ? handlePray : undefined}
                    onCommentAdded={handleCommentAdded}
                    onCommentDeleted={handleCommentDeleted}
                    canInteract={canInteractPrayer}
                    onLockedPress={!canInteractPrayer ? () => { const a = getLockedFeatureAlert('prayer_interact', journeyLevel); if (a) Alert.alert(a.title, a.message, [{ text: 'Entendi' }]); } : undefined}
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
                          style={[styles.myRequestActionBtn, !canRespondPrayer && { opacity: 0.8 }]}
                          onPress={() => {
                            if (canRespondPrayer) {
                              setMarkAnsweredRequest(request);
                              setTestimonyText(request.testimony ?? '');
                            } else {
                              (() => { const a = getLockedFeatureAlert('prayer_respond', journeyLevel); if (a) Alert.alert(a.title, a.message, [{ text: 'Entendi' }]); })();
                            }
                          }}
                        >
                          {canRespondPrayer ? (
                            <CheckIcon size={18} color={COLORS.success} />
                          ) : (
                            <Lock size={18} color={COLORS.textSecondary} />
                          )}
                          <Text style={[styles.myRequestActionText, canRespondPrayer ? { color: COLORS.success } : { color: COLORS.textSecondary }]}>
                            Marcar respondido
                          </Text>
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
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{editingRequest ? 'Editar pedido' : 'Novo pedido de oração'}</Text>
                  <TouchableOpacity onPress={() => { setShowNewRequestModal(false); setEditingRequest(null); setNewRequest({ title: '', description: '', isPrivate: false, category: 'personal' }); }} style={styles.modalCloseBtn}>
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
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Marcar como respondido</Text>
                  <TouchableOpacity onPress={() => { setMarkAnsweredRequest(null); setTestimonyText(''); }} style={styles.modalCloseBtn}>
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
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, ...(Platform.OS === 'web' && { opacity: 0, transition: 'opacity 0.4s ease-out' }) },
  visible: { opacity: 1 },
  headerWrap: { paddingTop: SPACING.LG, paddingBottom: SPACING.XL, paddingHorizontal: SPACING.LG, position: 'relative', overflow: 'hidden' },
  headerGradientBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  headerTitle: { ...TYPOGRAPHY.h1, color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: SPACING.MD },
  addButton: { position: 'absolute', right: SPACING.LG, top: SPACING.LG, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: SPACING.LG, marginTop: SPACING.MD, marginBottom: SPACING.SM, gap: 10 },
  tabChip: { flex: 1, paddingVertical: 12, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', ...SHADOWS.small },
  tabChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  tabTextActive: { color: '#fff' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: SPACING.LG, marginBottom: SPACING.SM, gap: 8 },
  visibilityRow: { flexDirection: 'row', paddingHorizontal: SPACING.LG, marginBottom: SPACING.MD, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, gap: 6, ...SHADOWS.small },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  filterTextActive: { color: '#fff' },
  myRequestCardWrap: { marginBottom: SPACING.MD },
  myRequestActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.SM, marginBottom: SPACING.LG },
  myRequestActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  myRequestActionText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.XXL },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.XL, alignItems: 'center', marginHorizontal: SPACING.LG, ...SHADOWS.small },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${COLORS.primary}15`, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.MD },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.LG, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: SPACING.SM },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.LG },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalCloseBtn: { padding: 4 },
  modalClose: { fontSize: 22, color: COLORS.textSecondary, fontWeight: '600' },
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
