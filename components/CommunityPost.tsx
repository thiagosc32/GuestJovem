import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Heart, MessageCircle, User, Send, Edit2, Trash2 } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS } from '../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { CommunityPost as CommunityPostType } from '../types/models';
import { getCommunityPostComments, createCommunityPostComment, updateCommunityPostComment, deleteCommunityPostComment } from '../services/supabase';
import { supabase } from '../services/supabase';

export interface PostComment {
  id: string;
  userId: string;
  content: string;
  userName: string;
  userAvatar?: string | null;
  createdAt: string;
}

interface CommunityPostProps {
  post: CommunityPostType;
  onLike?: (postId: string) => void | Promise<void>;
  onCommentAdded?: (postId: string) => void;
  onCommentDeleted?: (postId: string) => void;
}

export default function CommunityPost({ post, onLike, onCommentAdded, onCommentDeleted }: CommunityPostProps) {
  const [liked, setLiked] = useState(false);
  const likeCount = post.likes;
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const displayCommentsCount = Math.max(post.commentsCount ?? 0, comments.length);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      const data = await getCommunityPostComments(post.id);
      setComments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('Erro ao carregar comentários:', e);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [post.id]);

  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next) loadComments();
  };

  const handleLike = () => {
    if (onLike && !liked) {
      setLiked(true);
      onLike(post.id);
    }
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text || sendingComment) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSendingComment(true);
    try {
      const created = await createCommunityPostComment(post.id, user.id, text);
      let userName = 'Você';
      let userAvatar: string | null = null;
      try {
        const { data: profile } = await supabase.from('users').select('name, avatar_url').eq('id', user.id).single();
        if (profile) {
          userName = (profile as any).name || userName;
          userAvatar = (profile as any).avatar_url ?? null;
        }
      } catch (_) {}
      setComments((prev) => [
        ...prev,
        {
          id: (created as any)?.id ?? `temp-${Date.now()}`,
          userId: user.id,
          content: text,
          userName,
          userAvatar,
          createdAt: (created as any)?.created_at ?? new Date().toISOString(),
        },
      ]);
      setCommentText('');
      onCommentAdded?.(post.id);
    } catch (e) {
      console.warn('Erro ao enviar comentário:', e);
    } finally {
      setSendingComment(false);
    }
  };

  const handleSaveEditComment = async () => {
    if (!editingCommentId || !editingText.trim()) return;
    try {
      await updateCommunityPostComment(editingCommentId, editingText.trim());
      setComments((prev) => prev.map((c) => (c.id === editingCommentId ? { ...c, content: editingText.trim() } : c)));
      setEditingCommentId(null);
      setEditingText('');
    } catch (e) {
      console.warn('Erro ao editar comentário:', e);
    }
  };

  const handleDeleteComment = (c: PostComment) => {
    Alert.alert('Excluir comentário', 'Deseja realmente excluir este comentário?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCommunityPostComment(c.id);
            setComments((prev) => prev.filter((x) => x.id !== c.id));
            onCommentDeleted?.(post.id);
          } catch (e) {
            console.warn('Erro ao excluir comentário:', e);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {post.userAvatar ? (
            <Image source={{ uri: post.userAvatar }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{post.userName.charAt(0)}</Text>
            </View>
          )}
          <View>
            <Text style={styles.userName}>{post.userName}</Text>
            <Text style={styles.timestamp}>
              {new Date(post.createdAt).toLocaleDateString('pt-BR', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
        {post.isModerated && (
          <View style={styles.moderatedBadge}>
            <Text style={styles.moderatedBadgeText}>✓</Text>
          </View>
        )}
      </View>

      <Text style={styles.content}>{post.content}</Text>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike} disabled={!onLike || liked}>
          <Heart size={20} color={liked ? COLORS.error : COLORS.textSecondary} fill={liked ? COLORS.error : 'none'} />
          <Text style={[styles.actionText, liked && styles.actionTextActive]}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleToggleComments}>
          <MessageCircle size={20} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>{displayCommentsCount}</Text>
        </TouchableOpacity>
      </View>

      {showComments && (
        <View style={styles.commentsContainer}>
          {loadingComments ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: SPACING.SM }} />
          ) : (
            <>
              {comments.map((c) => (
                <View key={c.id} style={styles.comment}>
                  <View style={styles.commentAuthorRow}>
                    {c.userAvatar ? (
                      <Image source={{ uri: c.userAvatar }} style={styles.commentAvatar} resizeMode="cover" />
                    ) : (
                      <View style={styles.commentAvatarPlaceholder}>
                        <User size={14} color={COLORS.textSecondary} />
                      </View>
                    )}
                    <Text style={styles.commentAuthor}>{c.userName}</Text>
                    {currentUserId === c.userId && (
                      <View style={styles.commentActions}>
                        {editingCommentId === c.id ? (
                          <>
                            <TouchableOpacity onPress={handleSaveEditComment} style={styles.commentActionBtn}>
                              <Text style={styles.commentActionSave}>Salvar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setEditingCommentId(null); setEditingText(''); }} style={styles.commentActionBtn}>
                              <Text style={styles.commentActionCancel}>Cancelar</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <TouchableOpacity onPress={() => { setEditingCommentId(c.id); setEditingText(c.content); }} style={styles.commentActionBtn}>
                              <Edit2 size={14} color={COLORS.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteComment(c)} style={styles.commentActionBtn}>
                              <Trash2 size={14} color={COLORS.error} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                  {editingCommentId === c.id ? (
                    <TextInput
                      style={styles.commentEditInput}
                      value={editingText}
                      onChangeText={setEditingText}
                      multiline
                      maxLength={500}
                    />
                  ) : (
                    <Text style={styles.commentContent}>{c.content}</Text>
                  )}
                  <Text style={styles.commentTime}>
                    {new Date(c.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))}
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Escreva um comentário..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                  editable={!sendingComment}
                />
                <TouchableOpacity
                  style={[styles.commentSend, (!commentText.trim() || sendingComment) && styles.commentSendDisabled]}
                  onPress={handleSubmitComment}
                  disabled={!commentText.trim() || sendingComment}
                >
                  {sendingComment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Send size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    ...SHADOWS.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
  },
  avatarText: {
    ...TYPOGRAPHY.body,
    color: '#fff',
    fontWeight: '600',
  },
  userName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  timestamp: {
    ...TYPOGRAPHY.caption,
  },
  moderatedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${COLORS.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moderatedBadgeText: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    ...TYPOGRAPHY.body,
    lineHeight: 22,
    marginBottom: SPACING.MD,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.LG,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
  actionText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },
  actionTextActive: {
    color: COLORS.error,
  },
  commentsContainer: {
    marginTop: SPACING.MD,
    paddingTop: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  comment: {
    marginBottom: SPACING.SM,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    marginBottom: 4,
  },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.XS, marginLeft: 'auto' },
  commentActionBtn: { padding: 4 },
  commentActionSave: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  commentActionCancel: { fontSize: 12, color: COLORS.textSecondary },
  commentEditInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.SM,
    padding: SPACING.SM,
    marginBottom: 4,
    minHeight: 60,
    ...TYPOGRAPHY.bodySmall,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
  },
  commentAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAuthor: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
  commentContent: {
    ...TYPOGRAPHY.bodySmall,
  },
  commentTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.SM,
    marginTop: SPACING.SM,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    minHeight: 40,
    maxHeight: 100,
    ...TYPOGRAPHY.bodySmall,
  },
  commentSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSendDisabled: {
    backgroundColor: COLORS.border,
  },
});
