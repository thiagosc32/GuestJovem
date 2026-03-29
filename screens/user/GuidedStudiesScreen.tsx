/**
 * Estudos em grupo — usuários podem iniciar estudos sobre temas ou livros específicos com comentários e interação.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { BookMarked, ArrowLeft, Plus, Send, User, Users, MessageSquare, ChevronDown, ChevronRight, Lock } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Gradient from '../../components/ui/Gradient';
import {
  getGroupStudies,
  createGroupStudy,
  getGroupStudyById,
  isGroupStudyParticipant,
  joinGroupStudy,
  getGroupStudyParticipants,
  getGroupStudyTopics,
  createGroupStudyTopic,
  getGroupStudyTopicReplies,
  createGroupStudyTopicReply,
  type GroupStudy,
  type GroupStudyParticipant,
  type GroupStudyTopic,
  type GroupStudyTopicReply,
} from '../../services/supabase';
import { getCurrentUser, supabase } from '../../services/supabase';
import { isFeatureAvailableForLevel, getLockedFeatureAlert } from '../../constants/featureGates';
import { getJourneySummary } from '../../services/spiritualJourney';

type NavParams = { GuidedStudiesScreen: { studyId?: string } };

export default function GuidedStudiesScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<NavParams, 'GuidedStudiesScreen'>>();
  const studyIdParam = route.params?.studyId;

  const [studies, setStudies] = useState<GroupStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewStudyModal, setShowNewStudyModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTheme, setNewTheme] = useState('');
  const [newBookRef, setNewBookRef] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const [selectedStudy, setSelectedStudy] = useState<GroupStudy | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [participants, setParticipants] = useState<GroupStudyParticipant[]>([]);
  const [topics, setTopics] = useState<GroupStudyTopic[]>([]);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [topicReplies, setTopicReplies] = useState<Record<string, GroupStudyTopicReply[]>>({});
  const [loadingStudy, setLoadingStudy] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicContent, setNewTopicContent] = useState('');
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [canCreateStudy, setCanCreateStudy] = useState(true);
  const [journeyLevel, setJourneyLevel] = useState(1);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      setCurrentUserId(user.id);
      const summary = await getJourneySummary(user.id);
      const level = summary?.level ?? 1;
      setJourneyLevel(level);
      setCanCreateStudy(isFeatureAvailableForLevel('group_study_create', level));
    })();
  }, []);

  const loadStudies = useCallback(async () => {
    try {
      const data = await getGroupStudies();
      setStudies(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Erro ao carregar estudos', e);
      setStudies([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadStudies().finally(() => setLoading(false));
      if (studyIdParam) {
        openStudyDetail(studyIdParam);
      }
    }, [studyIdParam])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStudies();
    if (selectedStudy) {
      const user = await getCurrentUser();
      const userId = (user as any)?.id;
      const [study, partList, topicList] = await Promise.all([
        getGroupStudyById(selectedStudy.id),
        getGroupStudyParticipants(selectedStudy.id),
        getGroupStudyTopics(selectedStudy.id),
      ]);
      if (study) setSelectedStudy(study);
      setParticipants(partList ?? []);
      setTopics(topicList ?? []);
      if (userId) {
        const part = await isGroupStudyParticipant(selectedStudy.id, userId);
        setIsParticipant(part);
      }
      const repliesMap: Record<string, GroupStudyTopicReply[]> = {};
      for (const t of topicList ?? []) {
        const replies = await getGroupStudyTopicReplies(t.id);
        repliesMap[t.id] = replies;
      }
      setTopicReplies(repliesMap);
    }
    setRefreshing(false);
  };

  const openStudyDetail = async (id: string) => {
    setLoadingStudy(true);
    setSelectedStudy(null);
    setParticipants([]);
    setTopics([]);
    setExpandedTopicId(null);
    setTopicReplies({});
    try {
      const user = await getCurrentUser();
      const userId = (user as any)?.id;
      const study = await getGroupStudyById(id);
      if (study) {
        setSelectedStudy(study);
        const [partList, topicList] = await Promise.all([
          getGroupStudyParticipants(id),
          getGroupStudyTopics(id),
        ]);
        setParticipants(partList ?? []);
        setTopics(topicList ?? []);
        if (userId) {
          const part = await isGroupStudyParticipant(id, userId);
          setIsParticipant(part);
        }
        const repliesMap: Record<string, GroupStudyTopicReply[]> = {};
        for (const t of topicList ?? []) {
          const replies = await getGroupStudyTopicReplies(t.id);
          repliesMap[t.id] = replies;
        }
        setTopicReplies(repliesMap);
      } else {
        const fallback = studies.find((s) => s.id === id);
        if (fallback) setSelectedStudy(fallback);
      }
    } catch (e) {
      console.warn('Erro ao carregar estudo', e);
    } finally {
      setLoadingStudy(false);
    }
  };

  const handleJoinStudy = async () => {
    if (!selectedStudy) return;
    Alert.alert(
      'Participar do estudo',
      `Deseja participar de "${selectedStudy.title}"? Você poderá criar tópicos e participar dos debates.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Participar',
          onPress: async () => {
            const user = await getCurrentUser();
            const userId = (user as any)?.id;
            if (!userId) {
              Alert.alert('Erro', 'Faça login para participar.');
              return;
            }
            setJoinLoading(true);
            try {
              await joinGroupStudy(selectedStudy.id, userId);
              setIsParticipant(true);
              const partList = await getGroupStudyParticipants(selectedStudy.id);
              setParticipants(partList ?? []);
              const study = await getGroupStudyById(selectedStudy.id);
              if (study) setSelectedStudy(study);
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível participar.');
            } finally {
              setJoinLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateTopic = async () => {
    if (!selectedStudy || !newTopicTitle.trim()) {
      Alert.alert('Campo obrigatório', 'Preencha o título do tópico.');
      return;
    }
    const user = await getCurrentUser();
    const userId = (user as any)?.id;
    if (!userId) return;
    setCreatingTopic(true);
    try {
      await createGroupStudyTopic(selectedStudy.id, userId, newTopicTitle.trim(), newTopicContent.trim() || null);
      setShowNewTopicModal(false);
      setNewTopicTitle('');
      setNewTopicContent('');
      const topicList = await getGroupStudyTopics(selectedStudy.id);
      setTopics(topicList ?? []);
      const study = await getGroupStudyById(selectedStudy.id);
      if (study) setSelectedStudy(study);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível criar o tópico.');
    } finally {
      setCreatingTopic(false);
    }
  };

  const handleSendReply = async (topicId: string) => {
    const text = replyText[topicId]?.trim();
    if (!text) return;
    const user = await getCurrentUser();
    const userId = (user as any)?.id;
    if (!userId) return;
    setSendingReply(topicId);
    try {
      await createGroupStudyTopicReply(topicId, userId, text);
      setReplyText((prev) => ({ ...prev, [topicId]: '' }));
      const replies = await getGroupStudyTopicReplies(topicId);
      setTopicReplies((prev) => ({ ...prev, [topicId]: replies }));
      setTopics((prev) => prev.map((t) => (t.id === topicId ? { ...t, repliesCount: replies.length } : t)));
      const study = selectedStudy ? await getGroupStudyById(selectedStudy.id) : null;
      if (study) setSelectedStudy(study);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível enviar a resposta.');
    } finally {
      setSendingReply(null);
    }
  };

  const toggleTopicExpand = async (topicId: string) => {
    if (expandedTopicId === topicId) {
      setExpandedTopicId(null);
      return;
    }
    setExpandedTopicId(topicId);
    if (!topicReplies[topicId]) {
      const replies = await getGroupStudyTopicReplies(topicId);
      setTopicReplies((prev) => ({ ...prev, [topicId]: replies }));
    }
  };

  const handleCreateStudy = async () => {
    if (!newTitle.trim() || !newTheme.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha título e tema.');
      return;
    }
    const user = await getCurrentUser();
    const userId = (user as any)?.id;
    if (!userId) {
      Alert.alert('Erro', 'Faça login para criar um estudo.');
      return;
    }
    setCreating(true);
    try {
      const created = await createGroupStudy({
        user_id: userId,
        title: newTitle.trim(),
        theme: newTheme.trim(),
        book_reference: newBookRef.trim() || null,
        description: newDescription.trim() || null,
      });
      setShowNewStudyModal(false);
      setNewTitle('');
      setNewTheme('');
      setNewBookRef('');
      setNewDescription('');
      await loadStudies();
      openStudyDetail(created.id);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível criar o estudo.');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (s: string) => {
    if (!s) return '';
    const d = new Date(s);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (selectedStudy && !loadingStudy) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Gradient colors={[theme.gradientStart, theme.gradientMiddle]} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedStudy(null)} activeOpacity={0.8}>
            <ArrowLeft size={24} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.detailTitle} numberOfLines={2}>{selectedStudy.title}</Text>
          <Text style={styles.detailSubtitle}>{selectedStudy.theme}{selectedStudy.book_reference ? ` • ${selectedStudy.book_reference}` : ''}</Text>
        </Gradient>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
          >
            {selectedStudy.description ? (
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionLabel}>Sobre o estudo</Text>
                <Text style={styles.descriptionText}>{selectedStudy.description}</Text>
              </View>
            ) : null}

            {/* Participantes */}
            <View style={styles.participantsCard}>
              <View style={styles.participantsHeader}>
                <Users size={20} color={COLORS.primary} />
                <Text style={styles.participantsTitle}>Participantes ({participants.length})</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.participantsScroll}>
                {participants.slice(0, 12).map((p) => (
                  <View key={p.id} style={styles.participantChip}>
                    <View style={styles.participantAvatar}>
                      <User size={14} color={COLORS.primary} />
                    </View>
                    <Text style={styles.participantName} numberOfLines={1}>{p.userName}</Text>
                  </View>
                ))}
                {participants.length > 12 && <Text style={styles.participantMore}>+{participants.length - 12}</Text>}
              </ScrollView>
            </View>

            {!isParticipant ? (
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={handleJoinStudy}
                disabled={joinLoading}
                activeOpacity={0.8}
              >
                {joinLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Plus size={20} color="#fff" />
                    <Text style={styles.joinBtnText}>Participar do estudo</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <>
                {currentUserId === selectedStudy.user_id && (
                  <TouchableOpacity style={styles.newTopicBtn} onPress={() => setShowNewTopicModal(true)} activeOpacity={0.8}>
                    <Plus size={20} color={COLORS.primary} />
                    <Text style={styles.newTopicBtnText}>Novo tópico de debate</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.topicsSection}>
                  <View style={styles.topicsHeader}>
                    <MessageSquare size={20} color={COLORS.primary} />
                    <Text style={styles.topicsSectionTitle}>Tópicos de debate ({topics.length})</Text>
                  </View>
                  {topics.length === 0 ? (
                    <View style={styles.topicsEmpty}>
                      <MessageSquare size={36} color={COLORS.border} />
                      <Text style={styles.topicsEmptyText}>
                        {currentUserId === selectedStudy.user_id ? 'Nenhum tópico ainda. Crie o primeiro!' : 'Nenhum tópico ainda. O criador do estudo pode iniciar debates.'}
                      </Text>
                    </View>
                  ) : (
                    topics.map((topic) => {
                      const expanded = expandedTopicId === topic.id;
                      const replies = topicReplies[topic.id] ?? [];
                      return (
                        <View key={topic.id} style={styles.topicCard}>
                          <TouchableOpacity
                            style={styles.topicHeader}
                            onPress={() => toggleTopicExpand(topic.id)}
                            activeOpacity={0.9}
                          >
                            {expanded ? <ChevronDown size={22} color={COLORS.primary} /> : <ChevronRight size={22} color={COLORS.primary} />}
                            <View style={styles.topicHeaderBody}>
                              <Text style={styles.topicTitle}>{topic.title}</Text>
                              <Text style={styles.topicMeta}>por {topic.authorName} • {formatDate(topic.createdAt)} • {topic.repliesCount ?? replies.length} resposta(s)</Text>
                            </View>
                          </TouchableOpacity>
                          {expanded && (
                            <View style={styles.topicBody}>
                              {topic.content ? (
                                <View style={styles.topicContent}>
                                  <Text style={styles.topicContentText}>{topic.content}</Text>
                                </View>
                              ) : null}
                              {replies.map((r) => (
                                <View key={r.id} style={styles.replyRow}>
                                  <View style={styles.replyAvatar}>
                                    <User size={14} color={COLORS.primary} />
                                  </View>
                                  <View style={styles.replyBody}>
                                    <Text style={styles.replyAuthor}>{r.userName}</Text>
                                    <Text style={styles.replyContent}>{r.content}</Text>
                                    <Text style={styles.replyDate}>{formatDate(r.createdAt)}</Text>
                                  </View>
                                </View>
                              ))}
                              <View style={styles.replyInputRow}>
                                <TextInput
                                  style={styles.replyInput}
                                  placeholder="Responder ao tópico..."
                                  placeholderTextColor={COLORS.textSecondary}
                                  value={replyText[topic.id] ?? ''}
                                  onChangeText={(t) => setReplyText((prev) => ({ ...prev, [topic.id]: t }))}
                                  multiline
                                  maxLength={500}
                                />
                                <TouchableOpacity
                                  style={[styles.replySendBtn, (!(replyText[topic.id] ?? '').trim() || sendingReply === topic.id) && styles.sendBtnDisabled]}
                                  onPress={() => handleSendReply(topic.id)}
                                  disabled={!(replyText[topic.id] ?? '').trim() || sendingReply === topic.id}
                                >
                                  {sendingReply === topic.id ? <ActivityIndicator size="small" color="#fff" /> : <Send size={18} color="#fff" />}
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal visible={showNewTopicModal} transparent animationType="slide">
          <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
            <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                  <Text style={styles.modalTitle}>Novo tópico de debate</Text>
                  <Text style={styles.inputLabel}>Título do tópico *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Qual a aplicação prática de João 15?"
                    placeholderTextColor={COLORS.textSecondary}
                    value={newTopicTitle}
                    onChangeText={setNewTopicTitle}
                  />
                  <Text style={styles.inputLabel}>Descrição (opcional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Contexto ou pergunta para iniciar o debate..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={newTopicContent}
                    onChangeText={setNewTopicContent}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowNewTopicModal(false); setNewTopicTitle(''); setNewTopicContent(''); }}>
                      <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.confirmBtn, creatingTopic && styles.confirmBtnDisabled]} onPress={handleCreateTopic} disabled={creatingTopic}>
                      {creatingTopic ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.confirmBtnText}>Criar tópico</Text>}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  if (loadingStudy) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Gradient colors={[theme.gradientStart, theme.gradientMiddle]} style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.getParent()?.navigate?.('MainTabs', { screen: 'UserDashboard' })}
          activeOpacity={0.8}
        >
          <ArrowLeft size={24} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Estudos em grupo</Text>
        <Text style={styles.subtitle}>
          Inicie um estudo sobre temas ou livros bíblicos e interaja com comentários.
        </Text>
      </Gradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        <TouchableOpacity
          style={[styles.newStudyBtn, !canCreateStudy && styles.newStudyBtnLocked]}
          onPress={() => {
            if (canCreateStudy) setShowNewStudyModal(true);
            else (() => { const a = getLockedFeatureAlert('group_study_create', journeyLevel); if (a) Alert.alert(a.title, a.message, [{ text: 'Entendi' }]); })();
          }}
          activeOpacity={0.9}
        >
          {canCreateStudy ? (
            <>
              <Plus size={22} color="#fff" />
              <Text style={styles.newStudyBtnText}>Iniciar novo estudo</Text>
            </>
          ) : (
            <>
              <Lock size={22} color="#fff" strokeWidth={2} />
              <Text style={styles.newStudyBtnText}>Iniciar novo estudo</Text>
            </>
          )}
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
        ) : studies.length === 0 ? (
          <View style={styles.emptyState}>
            <BookMarked size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Nenhum estudo ainda</Text>
            <Text style={styles.emptySubtitle}>Toque em "Iniciar novo estudo" para criar o primeiro e convidar a galera a participar.</Text>
          </View>
        ) : (
          studies.map((study) => (
            <TouchableOpacity
              key={study.id}
              style={styles.studyCard}
              onPress={() => openStudyDetail(study.id)}
              activeOpacity={0.8}
            >
              <BookMarked size={28} color={COLORS.primary} strokeWidth={1.5} style={styles.studyIcon} />
              <View style={styles.studyBody}>
                <Text style={styles.studyTitle}>{study.title}</Text>
                <Text style={styles.studyRef}>{study.theme}{study.book_reference ? ` • ${study.book_reference}` : ''}</Text>
                {((study.participantsCount ?? 0) > 0 || (study.topicsCount ?? 0) > 0) && (
                  <Text style={styles.studyMeta}>
                    {(study.participantsCount ?? 0)} participante(s) • {(study.topicsCount ?? 0)} tópico(s)
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={showNewStudyModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Pressable style={styles.modalBackdrop} onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <Text style={styles.modalTitle}>Iniciar estudo em grupo</Text>
                <Text style={styles.inputLabel}>Título do estudo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Permanecer em Cristo"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
                <Text style={styles.inputLabel}>Tema ou livro *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: João 15"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newTheme}
                  onChangeText={setNewTheme}
                />
                <Text style={styles.inputLabel}>Referência bíblica (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Jo 15:1-17"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newBookRef}
                  onChangeText={setNewBookRef}
                />
                <Text style={styles.inputLabel}>Descrição (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Conte sobre o objetivo deste estudo..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={newDescription}
                  onChangeText={setNewDescription}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNewStudyModal(false)}>
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.createBtn, creating && styles.createBtnDisabled]}
                    onPress={handleCreateStudy}
                    disabled={creating}
                  >
                    {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.createBtnText}>Criar</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: SPACING.LG, paddingBottom: SPACING.XL, paddingHorizontal: SPACING.LG },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  title: { ...TYPOGRAPHY.h1, color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 22 },
  detailTitle: { ...TYPOGRAPHY.h2, color: '#fff', marginBottom: 4 },
  detailSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  newStudyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.LG,
    gap: 8,
  },
  newStudyBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  newStudyBtnLocked: { opacity: 0.85 },
  studyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  studyIcon: { marginRight: SPACING.MD },
  studyBody: { flex: 1 },
  studyTitle: { ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.text },
  studyRef: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 4 },
  studyMeta: { ...TYPOGRAPHY.caption, color: COLORS.primary, marginTop: 2 },
  descriptionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  descriptionLabel: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
  descriptionText: { ...TYPOGRAPHY.body, color: COLORS.text, lineHeight: 22 },
  participantsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  participantsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.SM },
  participantsTitle: { ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.text },
  participantsScroll: { marginHorizontal: -4 },
  participantChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 4 },
  participantAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary + '30', alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  participantName: { ...TYPOGRAPHY.caption, color: COLORS.text, maxWidth: 80 },
  participantMore: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, alignSelf: 'center', marginLeft: 4 },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.LG,
    gap: 10,
  },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  newTopicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '20',
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.LG,
    gap: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  newTopicBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  topicsSection: { marginBottom: SPACING.XL },
  topicsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.MD },
  topicsSectionTitle: { ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.text },
  topicsEmpty: { alignItems: 'center', padding: SPACING.XL, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.MD, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
  topicsEmptyText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: SPACING.SM },
  topicCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  topicHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.MD },
  topicHeaderBody: { flex: 1 },
  topicTitle: { ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.text },
  topicMeta: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  topicBody: { paddingHorizontal: SPACING.MD, paddingBottom: SPACING.MD },
  topicContent: { backgroundColor: COLORS.background, padding: SPACING.SM, borderRadius: BORDER_RADIUS.SM, marginBottom: SPACING.MD },
  topicContentText: { ...TYPOGRAPHY.body, color: COLORS.text, lineHeight: 22 },
  replyRow: { flexDirection: 'row', marginBottom: SPACING.MD },
  replyAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary + '25', alignItems: 'center', justifyContent: 'center', marginRight: SPACING.SM },
  replyBody: { flex: 1 },
  replyAuthor: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.text },
  replyContent: { ...TYPOGRAPHY.body, color: COLORS.text, marginTop: 2 },
  replyDate: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: SPACING.SM,
    gap: SPACING.SM,
  },
  replyInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: 10,
    maxHeight: 80,
  },
  replySendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.MD,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.SM,
  },
  commentInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.LG, maxHeight: '90%' },
  modalScrollContent: { paddingBottom: SPACING.XL },
  modalTitle: { ...TYPOGRAPHY.h2, marginBottom: SPACING.LG },
  inputLabel: { fontWeight: '600', marginBottom: 4, marginTop: SPACING.SM },
  input: { ...TYPOGRAPHY.body, backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.MD, padding: SPACING.MD },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: SPACING.MD, marginTop: SPACING.XL },
  cancelBtn: { flex: 1, padding: SPACING.MD, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  createBtn: { flex: 1, backgroundColor: COLORS.primary, padding: SPACING.MD, borderRadius: BORDER_RADIUS.MD, alignItems: 'center' },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontWeight: '700' },
  confirmBtn: { flex: 1, backgroundColor: COLORS.primary, padding: SPACING.MD, borderRadius: BORDER_RADIUS.MD, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 40, paddingHorizontal: SPACING.LG },
  emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.textSecondary, marginTop: SPACING.MD },
  emptySubtitle: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
