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
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, MessageCircle, MessageSquare, ArrowLeft, Lock } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import CommunityPost from '../../components/CommunityPost';
import Gradient from '../../components/ui/Gradient';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, globalStyles, SHADOWS } from '../../constants/theme';
import { CommunityPost as CommunityPostType } from '../../types/models';
import { supabase, getCommunityPosts, createCommunityPost } from '../../services/supabase';
import { notifyAchievementUnlockIfNew } from '../../services/achievementsService';
import { isFeatureAvailableForLevel, getLockedFeatureAlert } from '../../constants/featureGates';
import { getJourneySummary } from '../../services/spiritualJourney';

function mapRowToPost(row: any): CommunityPostType {
  const user = row.users ?? {};
  const name = typeof user === 'object' && user !== null && 'name' in user ? (user as any).name : 'Usuário';
  return {
    id: row.id,
    userId: row.user_id,
    userName: name || 'Usuário',
    userAvatar: (user as any)?.avatar_url,
    content: row.content ?? '',
    imageUrl: row.image_url ?? undefined,
    likes: row.likes_count ?? 0,
    comments: [],
    commentsCount: row.comments_count ?? 0,
    isModerated: row.is_moderated ?? true,
    createdAt: row.created_at,
  };
}

export default function CommunityWall() {
  const theme = useAppTheme();
  const navigation = useNavigation<any>();
  const [posts, setPosts] = useState<CommunityPostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);
  const [canCreatePost, setCanCreatePost] = useState(true);
  const [canLikeComment, setCanLikeComment] = useState(true);
  const [journeyLevel, setJourneyLevel] = useState(1);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      const summary = await getJourneySummary(user.id);
      const level = summary?.level ?? 1;
      setJourneyLevel(level);
      setCanCreatePost(isFeatureAvailableForLevel('community_post', level));
      setCanLikeComment(isFeatureAvailableForLevel('community_like_comment', level));
    })();
  }, []);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCommunityPosts(50, 0);
      setPosts(Array.isArray(data) ? data.map(mapRowToPost) : []);
    } catch (err) {
      console.error('Erro ao carregar publicações:', err);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
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

  const handleSubmitPost = async () => {
    const content = newPostContent.trim();
    if (!content) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Erro', 'Faça login para publicar.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createCommunityPost({
        user_id: user.id,
        content,
        likes_count: 0,
        comments_count: 0,
        is_moderated: true,
      });
      notifyAchievementUnlockIfNew(user.id, 'community_posts').catch(() => {});
      setShowNewPostModal(false);
      setNewPostContent('');
      await loadPosts();
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Não foi possível publicar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = useCallback(async (postId: string) => {
    try {
      const { incrementPostLikes } = await import('../../services/supabase');
      await incrementPostLikes(postId);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes: p.likes + 1 } : p))
      );
    } catch (_) {}
  }, []);

  const handleCommentAdded = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: (p.commentsCount ?? 0) + 1 } : p))
    );
  }, []);

  const handleCommentDeleted = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: Math.max(0, (p.commentsCount ?? 0) - 1) } : p))
    );
  }, []);

  const ContentWrapper = Platform.OS === 'web' ? View : Animated.View;
  const containerStyle = Platform.OS === 'web'
    ? [styles.container, isVisible && styles.visible]
    : [styles.container, { opacity: fadeAnim }];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.screen}>
        <ContentWrapper style={containerStyle}>
          <View style={styles.headerWrap}>
            <Gradient
              colors={[theme.gradientStart, theme.gradientMiddle]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradientBg}
            />
            <TouchableOpacity style={styles.backBtn} onPress={() => (navigation as any).navigate('UserDashboard')} activeOpacity={0.8}>
              <ArrowLeft size={24} color="#fff" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Comunidade</Text>
            <Text style={styles.headerSubtitle}>Compartilhe encorajamento e novidades</Text>
            <TouchableOpacity
              style={[styles.addButton, !canCreatePost && styles.addButtonLocked]}
              onPress={() => {
                if (canCreatePost) setShowNewPostModal(true);
                else (() => { const a = getLockedFeatureAlert('community_post', journeyLevel); if (a) Alert.alert(a.title, a.message, [{ text: 'Entendi' }]); })();
              }}
              activeOpacity={0.9}
            >
              {canCreatePost ? (
                <Plus size={22} color="#fff" strokeWidth={2.5} />
              ) : (
                <Lock size={22} color="#fff" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.emptySubtext}>Carregando...</Text>
              </View>
            ) : posts.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <MessageCircle size={40} color={COLORS.primary} strokeWidth={1.5} />
                </View>
                <Text style={styles.emptyText}>Nenhuma publicação ainda</Text>
                <Text style={styles.emptySubtext}>Seja o primeiro a compartilhar com a comunidade!</Text>
              </View>
            ) : (
              posts.map((post) => (
                <CommunityPost
                  key={post.id}
                  post={post}
                  onLike={canLikeComment ? handleLike : undefined}
                  onCommentAdded={handleCommentAdded}
                  onCommentDeleted={handleCommentDeleted}
                  canInteract={canLikeComment}
                  onLockedPress={!canLikeComment ? () => { const a = getLockedFeatureAlert('community_like_comment', journeyLevel); if (a) Alert.alert(a.title, a.message, [{ text: 'Entendi' }]); } : undefined}
                />
              ))
            )}
          </ScrollView>
        </ContentWrapper>

        <Modal visible={showNewPostModal} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Nova publicação</Text>
                  <TouchableOpacity onPress={() => { setShowNewPostModal(false); setNewPostContent(''); }} disabled={isSubmitting} style={styles.modalCloseBtn}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.textArea}
                  placeholder="Compartilhe algo encorajador..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={newPostContent}
                  onChangeText={setNewPostContent}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  autoFocus
                  editable={!isSubmitting}
                />

                <Text style={styles.helperText}>Visível para toda a comunidade.</Text>

                <TouchableOpacity
                  style={[styles.submitButton, (!newPostContent.trim() || isSubmitting) && styles.submitButtonDisabled]}
                  onPress={handleSubmitPost}
                  disabled={!newPostContent.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Publicar</Text>
                  )}
                </TouchableOpacity>
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
  addButtonLocked: { opacity: 0.9, backgroundColor: 'rgba(255,255,255,0.15)' },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.XXL },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: SPACING.XL, alignItems: 'center', marginHorizontal: SPACING.LG, ...SHADOWS.small },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${COLORS.primary}15`, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.MD },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.LG },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: SPACING.SM },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.LG },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalCloseBtn: { padding: 4 },
  modalClose: { fontSize: 22, color: COLORS.textSecondary, fontWeight: '600' },
  textArea: { height: 150, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: SPACING.MD, fontSize: 16, color: COLORS.text, backgroundColor: COLORS.background, marginBottom: SPACING.MD, textAlignVertical: 'top' },
  helperText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: SPACING.LG, textAlign: 'center' },
  submitButton: { ...globalStyles.button, backgroundColor: COLORS.primary, borderRadius: 16 },
  submitButtonDisabled: { backgroundColor: COLORS.border },
  submitButtonText: { ...globalStyles.buttonText },
});
