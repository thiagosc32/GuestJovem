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
import { Plus, MessageCircle } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import CommunityPost from '../../components/CommunityPost';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, globalStyles, SHADOWS } from '../../constants/theme';
import { CommunityPost as CommunityPostType } from '../../types/models';
import { supabase, getCommunityPosts, createCommunityPost } from '../../services/supabase';

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
  const [posts, setPosts] = useState<CommunityPostType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

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
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <ContentWrapper style={containerStyle}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Mesa Guest Jovem</Text>
              <Text style={styles.headerSubtitle}>Compartilhe encorajamento e novidades</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowNewPostModal(true)}
            >
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.emptySubtext}>Carregando...</Text>
              </View>
            ) : posts.length === 0 ? (
              <View style={styles.emptyState}>
                <MessageCircle size={64} color={COLORS.textLight} />
                <Text style={styles.emptyText}>Nenhuma publicação ainda</Text>
                <Text style={styles.emptySubtext}>Seja o primeiro a compartilhar!</Text>
              </View>
            ) : (
              posts.map((post) => (
                <CommunityPost
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onCommentAdded={handleCommentAdded}
                  onCommentDeleted={handleCommentDeleted}
                />
              ))
            )}
          </ScrollView>
        </ContentWrapper>

        <Modal visible={showNewPostModal} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Nova Publicação</Text>
                  <TouchableOpacity onPress={() => { setShowNewPostModal(false); setNewPostContent(''); }} disabled={isSubmitting}>
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

                <Text style={styles.helperText}>Publicações visíveis para toda a comunidade.</Text>

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
  container: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      opacity: 0,
      transition: 'opacity 0.4s ease-out',
    }),
  },
  visible: {
    opacity: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.LG,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XXL,
  },
  emptyText: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XS,
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
  },
  modalClose: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  textArea: {
    height: 150,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.MD,
    textAlignVertical: 'top',
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.LG,
    textAlign: 'center',
  },
  submitButton: {
    ...globalStyles.button,
    backgroundColor: COLORS.primary,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  submitButtonText: {
    ...globalStyles.buttonText,
  },
});
