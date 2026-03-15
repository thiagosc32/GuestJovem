import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Calendar, Heart, Trophy, MessageCircle, ArrowLeft, Send, ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { Notification } from '../../types/models';
import { supabase, getNotifications, markNotificationRead, notifyUsersWithRole } from '../../services/supabase';

function mapRowToNotification(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title ?? '',
    message: row.message ?? '',
    type: row.type ?? 'announcement',
    isRead: Boolean(row.is_read),
    createdAt: row.created_at ?? new Date().toISOString(),
    actionUrl: row.action_url ?? undefined,
  };
}

export default function NotificationScreen() {
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createMessage, setCreateMessage] = useState('');
  const [createType, setCreateType] = useState<'announcement' | 'event' | 'reminder'>('announcement');
  const [createActionUrl, setCreateActionUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setNotifications([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const data = await getNotifications(user.id);
      setNotifications(Array.isArray(data) ? data.map(mapRowToNotification) : []);

      const { data: userRow } = await supabase.from('users').select('role').eq('id', user.id).single();
      setIsAdmin((userRow?.role ?? '') === 'admin');
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const handlePressNotification = useCallback(async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error('Erro ao marcar como lida:', err);
      }
    }
    if (notification.actionUrl) {
      try {
        if (notification.actionUrl === 'prayer_private' && isAdmin) {
          navigation.navigate('AdminPrivatePrayers');
        } else if (notification.actionUrl === 'community') {
          navigation.navigate('UserTabs', {
            screen: 'MainTabs',
            params: { screen: 'CommunityWall' },
          });
        } else if (notification.actionUrl.startsWith('prayer_request:')) {
          const requestId = notification.actionUrl.replace('prayer_request:', '');
          navigation.navigate('UserTabs', {
            screen: 'MainTabs',
            params: { screen: 'PrayerRequestScreen', params: { requestId } },
          });
        } else if (notification.actionUrl === 'prayer_request') {
          navigation.navigate('UserTabs', {
            screen: 'MainTabs',
            params: { screen: 'PrayerRequestScreen' },
          });
        } else if (notification.actionUrl.startsWith('event:')) {
          const eventId = notification.actionUrl.replace('event:', '');
          navigation.navigate('EventDetails', { eventId } as any);
        } else if (notification.actionUrl === 'devotional') {
          navigation.navigate('UserTabs', {
            screen: 'MainTabs',
            params: { screen: 'DevotionalScreen' },
          });
        } else if (notification.actionUrl === 'journey') {
          navigation.navigate('UserTabs', {
            screen: 'MainTabs',
            params: { screen: 'JourneyScreen' },
          });
        } else if (notification.actionUrl.startsWith('group_study:')) {
          const studyId = notification.actionUrl.replace('group_study:', '');
          navigation.navigate('UserTabs', {
            screen: 'MainTabs',
            params: { screen: 'GuidedStudiesScreen', params: { studyId } },
          });
        }
      } catch (_) {}
    }
  }, [navigation, isAdmin]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'event':
        return Calendar;
      case 'prayer':
        return Heart;
      case 'achievement':
        return Trophy;
      case 'announcement':
        return Bell;
      case 'reminder':
        return MessageCircle;
      default:
        return Bell;
    }
  };

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'event':
        return COLORS.secondary;
      case 'prayer':
        return COLORS.spiritualOrange;
      case 'achievement':
        return COLORS.success;
      case 'announcement':
        return COLORS.primary;
      case 'reminder':
        return COLORS.info;
      default:
        return COLORS.primary;
    }
  };

  const handleSendNotification = useCallback(async () => {
    const title = createTitle.trim();
    const message = createMessage.trim();
    if (!title || !message) {
      Alert.alert('Atenção', 'Preencha o título e a mensagem.');
      return;
    }
    setSending(true);
    try {
      const [countUser, countAdmin] = await Promise.all([
        notifyUsersWithRole({ role: 'user', type: createType, title, message, action_url: createActionUrl.trim() || null }),
        notifyUsersWithRole({ role: 'admin', type: createType, title, message, action_url: createActionUrl.trim() || null }),
      ]);
      const total = (countUser ?? 0) + (countAdmin ?? 0);
      Alert.alert('Enviado', `Notificação enviada para ${total} pessoa(s) na plataforma.`);
      setCreateTitle('');
      setCreateMessage('');
      setCreateActionUrl('');
      setShowCreateForm(false);
      loadNotifications();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível enviar a notificação.');
    } finally {
      setSending(false);
    }
  }, [createTitle, createMessage, createType, createActionUrl, loadNotifications]);

  const handleDeleteAllNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id || notifications.length === 0) return;
    Alert.alert(
      'Apagar notificações',
      'Todas as suas notificações serão apagadas. Isso só afeta a sua lista; outros usuários não são afetados. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.id);
              if (error) throw error;
              setNotifications([]);
              Alert.alert('Pronto', 'Suas notificações foram apagadas.');
            } catch (e: any) {
              Alert.alert('Erro', e?.message ?? 'Não foi possível apagar.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [notifications.length]);

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
            <Text style={styles.headerTitle}>Notificações</Text>
            {notifications.length > 0 ? (
              <TouchableOpacity
                onPress={handleDeleteAllNotifications}
                disabled={deleting}
                style={styles.headerDeleteButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Trash2 size={22} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
          >
            {isAdmin && (
              <View style={styles.createSection}>
                <TouchableOpacity
                  style={styles.createSectionHeader}
                  onPress={() => setShowCreateForm(!showCreateForm)}
                  activeOpacity={0.8}
                >
                  <Send size={22} color={COLORS.primary} />
                  <Text style={styles.createSectionTitle}>Criar notificação</Text>
                  {showCreateForm ? <ChevronUp size={22} color={COLORS.textSecondary} /> : <ChevronDown size={22} color={COLORS.textSecondary} />}
                </TouchableOpacity>
                {showCreateForm && (
                  <View style={styles.createForm}>
                    <Text style={styles.createLabel}>Título *</Text>
                    <TextInput
                      style={styles.createInput}
                      placeholder="Ex: Aviso importante"
                      placeholderTextColor={COLORS.textLight}
                      value={createTitle}
                      onChangeText={setCreateTitle}
                    />
                    <Text style={styles.createLabel}>Mensagem *</Text>
                    <TextInput
                      style={[styles.createInput, styles.createInputMultiline]}
                      placeholder="Texto da notificação..."
                      placeholderTextColor={COLORS.textLight}
                      value={createMessage}
                      onChangeText={setCreateMessage}
                      multiline
                      numberOfLines={3}
                    />
                    <Text style={styles.createLabel}>Tipo</Text>
                    <View style={styles.createTypeRow}>
                      {(['announcement', 'event', 'reminder'] as const).map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[styles.createTypeChip, createType === t && styles.createTypeChipActive]}
                          onPress={() => setCreateType(t)}
                        >
                          <Text style={[styles.createTypeChipText, createType === t && styles.createTypeChipTextActive]}>
                            {t === 'announcement' ? 'Aviso' : t === 'event' ? 'Evento' : 'Lembrete'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.createLabel}>Link de ação (opcional)</Text>
                    <TextInput
                      style={styles.createInput}
                      placeholder="Ex: event:uuid ou devotional"
                      placeholderTextColor={COLORS.textLight}
                      value={createActionUrl}
                      onChangeText={setCreateActionUrl}
                    />
                    <TouchableOpacity
                      style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                      onPress={handleSendNotification}
                      disabled={sending}
                    >
                      {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendButtonText}>Enviar para todos os jovens</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Carregando...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Bell size={64} color={COLORS.textLight} />
                <Text style={styles.emptyText}>Nenhuma notificação</Text>
                <Text style={styles.emptySubtext}>Você está em dia!</Text>
              </View>
            ) : (
              notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const iconColor = getIconColor(notification.type);
                return (
                  <TouchableOpacity
                    key={notification.id}
                    style={[
                      styles.notificationCard,
                      !notification.isRead && styles.notificationCardUnread,
                    ]}
                    onPress={() => handlePressNotification(notification)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                      <Icon size={24} color={iconColor} />
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationMessage}>{notification.message}</Text>
                      <Text style={styles.notificationTime}>
                        {new Date(notification.createdAt).toLocaleDateString('pt-BR', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    {!notification.isRead && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </ContentWrapper>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  headerDeleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.LG,
    paddingBottom: SPACING.XXL,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XXL,
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.SM,
    ...SHADOWS.small,
  },
  notificationCardUnread: {
    backgroundColor: COLORS.surfaceVariant,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },
  notificationMessage: {
    ...TYPOGRAPHY.bodySmall,
    marginBottom: SPACING.XS,
  },
  notificationTime: {
    ...TYPOGRAPHY.caption,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.SM,
    marginTop: SPACING.SM,
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
  createSection: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.LG,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  createSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    gap: 10,
  },
  createSectionTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    flex: 1,
    color: COLORS.text,
  },
  createForm: {
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  createLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    marginTop: SPACING.MD,
    marginBottom: 6,
    color: COLORS.text,
  },
  createInput: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  createInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  createTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  createTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  createTypeChipActive: {
    backgroundColor: COLORS.primary + '18',
    borderColor: COLORS.primary,
  },
  createTypeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  createTypeChipTextActive: {
    color: COLORS.primary,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.MD,
    marginTop: SPACING.LG,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
