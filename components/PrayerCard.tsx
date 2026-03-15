import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Image, Alert } from 'react-native';
import { Heart, Lock, CheckCircle, MessageCircle, Send, User, Edit2, Trash2 } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS } from '../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { PrayerRequest } from '../types/models';
import { getPrayerRequestComments, createPrayerRequestComment, updatePrayerRequestComment, deletePrayerRequestComment } from '../services/supabase';
import { supabase } from '../services/supabase';

export interface PrayerComment {
  id: string;
  userId: string;
  content: string;
  userName: string;
  userAvatar?: string | null;
  createdAt: string;
}

export interface PrayerCardProps {
  request: PrayerRequest;
  hasPrayed?: boolean;
  onPray?: (requestId: string) => void | Promise<void>;
  onCommentAdded?: (requestId: string) => void;
  onCommentDeleted?: (requestId: string) => void;
  /** Se false (Ouvir), não pode orar por nem comentar — exibe cadeado */
  canInteract?: boolean;
  /** Chamado ao tocar em orar/comentar quando bloqueado */
  onLockedPress?: () => void;
}

export default function PrayerCard({ request, hasPrayed = false, onPray, onCommentAdded, onCommentDeleted, canInteract = true, onLockedPress }: PrayerCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PrayerComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      const data = await getPrayerRequestComments(request.id);
      const list: PrayerComment[] = Array.isArray(data) ? data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        content: row.content,
        userName: row.userName ?? 'Usuário',
        userAvatar: row.userAvatar ?? null,
        createdAt: row.created_at,
      })) : [];
      setComments(list);
    } catch (e) {
      console.warn('Erro ao carregar comentários:', e);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [request.id]);

  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next) loadComments();
  };

  const handleSaveEditComment = async () => {
    if (!editingCommentId || !editingText.trim()) return;
    try {
      await updatePrayerRequestComment(editingCommentId, editingText.trim());
      setComments((prev) => prev.map((c) => (c.id === editingCommentId ? { ...c, content: editingText.trim() } : c)));
      setEditingCommentId(null);
      setEditingText('');
    } catch (e) {
      console.warn('Erro ao editar comentário:', e);
    }
  };

  const handleDeleteComment = (c: PrayerComment) => {
    Alert.alert('Excluir comentário', 'Deseja realmente excluir este comentário?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePrayerRequestComment(c.id);
            setComments((prev) => prev.filter((x) => x.id !== c.id));
            onCommentDeleted?.(request.id);
          } catch (e) {
            console.warn('Erro ao excluir comentário:', e);
          }
        },
      },
    ]);
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text || sendingComment) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSendingComment(true);
    try {
      const created = await createPrayerRequestComment(request.id, user.id, text);
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
      onCommentAdded?.(request.id);
    } catch (e) {
      console.warn('Erro ao enviar comentário:', e);
    } finally {
      setSendingComment(false);
    }
  };

  const getCategoryColor = (category: PrayerRequest['category']) => {
    switch (category) {
      case 'personal':
        return COLORS.primary;
      case 'family':
        return COLORS.secondary;
      case 'health':
        return COLORS.error;
      case 'spiritual':
        return COLORS.spiritualOrange;
      default:
        return COLORS.textSecondary;
    }
  };

  const getCategoryLabel = (category: PrayerRequest['category']) => {
    switch (category) {
      case 'personal': return 'Pessoal';
      case 'family': return 'Família';
      case 'health': return 'Saúde';
      case 'spiritual': return 'Espiritual';
      case 'other': return 'Outro';
      default: return category;
    }
  };

  const handlePrayPress = () => {
    if (!canInteract) {
      onLockedPress?.();
      return;
    }
    if (onPray && !request.isAnswered) onPray(request.id);
  };

  const handleCommentOrToggle = () => {
    if (!canInteract) {
      onLockedPress?.();
      return;
    }
    handleToggleComments();
  };

  return (
    <View style={[styles.container, request.isAnswered && styles.containerAnswered]}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {request.userAvatar ? (
            <Image source={{ uri: request.userAvatar }} style={styles.userAvatar} resizeMode="cover" />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Text style={styles.userAvatarText}>{request.userName.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.userNameAndBadges}>
            <Text style={styles.userName}>{request.userName}</Text>
            <View style={styles.badges}>
            {request.isPrivate && (
              <View style={styles.privateBadge}>
                <Lock size={12} color={COLORS.textSecondary} />
                <Text style={styles.privateBadgeText}>Privado</Text>
              </View>
            )}
            <View style={[styles.categoryBadge, { backgroundColor: `${getCategoryColor(request.category)}20` }]}>
              <Text style={[styles.categoryText, { color: getCategoryColor(request.category) }]}>
                {getCategoryLabel(request.category)}
              </Text>
            </View>
          </View>
          </View>
        </View>
        {request.isAnswered && (
          <View style={styles.answeredBadge}>
            <CheckCircle size={20} color={COLORS.success} />
          </View>
        )}
      </View>

      <Text style={styles.title}>{request.title}</Text>
      <Text style={styles.description} numberOfLines={3}>
        {request.description}
      </Text>

      {request.isAnswered && request.isPrivate && request.leadershipMessage && (
        <View style={styles.testimonyContainer}>
          <Text style={styles.testimonyLabel}>Mensagem da liderança:</Text>
          <Text style={styles.testimony}>{request.leadershipMessage}</Text>
        </View>
      )}
      {request.isAnswered && !request.isPrivate && request.testimony && (
        <View style={styles.testimonyContainer}>
          <Text style={styles.testimonyLabel}>Testemunho:</Text>
          <Text style={styles.testimony}>{request.testimony}</Text>
        </View>
      )}

      {!request.isPrivate && (
        <View style={styles.footer}>
          <View style={styles.prayerCount}>
            <Heart
              size={16}
              color={hasPrayed ? COLORS.error : COLORS.textSecondary}
              fill={hasPrayed ? COLORS.error : 'none'}
            />
            <Text style={styles.prayerCountText}>{request.prayerCount} orações</Text>
          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[styles.commentsActionButton, !canInteract && styles.actionButtonLocked]}
              onPress={handleCommentOrToggle}
            >
              {canInteract ? (
                <MessageCircle size={18} color={COLORS.textSecondary} />
              ) : (
                <Lock size={16} color={COLORS.textSecondary} />
              )}
              <Text style={styles.commentsActionText}>
                {Math.max(request.commentsCount ?? 0, comments.length)}
              </Text>
            </TouchableOpacity>
            {!request.isAnswered && (onPray || !canInteract) && (
              <TouchableOpacity
                style={[styles.prayButton, hasPrayed && styles.prayButtonActive, !canInteract && styles.actionButtonLocked]}
                onPress={handlePrayPress}
                disabled={canInteract && hasPrayed}
              >
                {canInteract ? (
                  <Heart size={16} color={hasPrayed ? '#fff' : COLORS.primary} fill={hasPrayed ? '#fff' : 'none'} />
                ) : (
                  <Lock size={16} color={COLORS.primary} />
                )}
                <Text style={[styles.prayButtonText, hasPrayed && styles.prayButtonTextActive]}>
                  {hasPrayed ? 'Orei' : 'Orar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {!request.isPrivate && showComments && (
            <View style={styles.commentsSection}>
              {loadingComments ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: SPACING.SM }} />
              ) : (
                comments.map((c) => (
                  <View key={c.id} style={styles.commentRow}>
                    <View style={styles.commentAuthorRow}>
                      {c.userAvatar ? (
                        <Image source={{ uri: c.userAvatar }} style={styles.commentAvatar} resizeMode="cover" />
                      ) : (
                        <View style={styles.commentAvatarPlaceholder}>
                          <User size={16} color={COLORS.textSecondary} />
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
                ))
              )}
              {canInteract ? (
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
              ) : (
                <TouchableOpacity style={styles.commentInputLocked} onPress={onLockedPress}>
                  <Lock size={18} color={COLORS.textSecondary} />
                  <Text style={styles.commentInputLockedText}>Toque para ver em qual nível está disponível</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

      <Text style={styles.timestamp}>
        {new Date(request.createdAt).toLocaleDateString('pt-BR', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </Text>
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
  containerAnswered: {
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.SM },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.border,
  },
  userAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    ...TYPOGRAPHY.body,
    color: '#fff',
    fontWeight: '600',
  },
  userNameAndBadges: { flex: 1 },
  userName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },
  badges: { flexDirection: 'row', gap: SPACING.XS },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.border,
    gap: SPACING.XS,
  },
  privateBadgeText: { fontSize: 12, color: COLORS.textSecondary },
  categoryBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
  },
  categoryText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  answeredBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { ...TYPOGRAPHY.body, fontWeight: '600', marginBottom: SPACING.SM },
  description: { ...TYPOGRAPHY.bodySmall, lineHeight: 20, marginBottom: SPACING.MD },
  testimonyContainer: {
    backgroundColor: COLORS.surfaceVariant,
    padding: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
    marginBottom: SPACING.MD,
  },
  testimonyLabel: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.success, marginBottom: SPACING.XS },
  testimony: { ...TYPOGRAPHY.bodySmall, fontStyle: 'italic' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  prayerCount: { flexDirection: 'row', alignItems: 'center', gap: SPACING.XS },
  prayerCountText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.LG },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: `${COLORS.primary}20`,
    gap: SPACING.XS,
  },
  prayButtonActive: { backgroundColor: COLORS.primary },
  prayButtonText: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', color: COLORS.primary },
  prayButtonTextActive: { color: '#fff' },
  commentsActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
  commentsActionText: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  commentRow: {
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
  commentAuthor: { ...TYPOGRAPHY.bodySmall, fontWeight: '600', flex: 1 },
  commentContent: { ...TYPOGRAPHY.bodySmall, color: COLORS.text },
  commentTime: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
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
  commentSendDisabled: { backgroundColor: COLORS.border },
  actionButtonLocked: { opacity: 0.8 },
  commentInputLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    marginTop: SPACING.SM,
    padding: SPACING.MD,
    backgroundColor: `${COLORS.border}30`,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  commentInputLockedText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, flex: 1 },
  timestamp: { ...TYPOGRAPHY.caption },
});
