import { supabase, signOut, deleteDevotional, getAdminAnalytics, getAppSetting, setAppSetting } from '../../services/supabase';
import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Platform, 
  StatusBar, 
  ActivityIndicator, 
  TextInput, 
  Modal, 
  KeyboardAvoidingView,
  Alert, 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Users, Calendar, TrendingUp, Heart, QrCode, Bell, LogOut, BookOpen, 
Plus, Megaphone, Edit2, Trash2, X, Settings, Image as ImageIcon, User, Lock, ChevronDown, ChevronRight, ArrowLeft, LayoutGrid, Palette
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

import Gradient from '../../components/ui/Gradient';
import ProgressCard from '../../components/ProgressCard';
import { COLORS } from '../../constants/colors';
import { getDevotionalCategoryLabel } from '../../constants/devotionalCategories';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, globalStyles, SHADOWS } from '../../constants/theme';
import { RootStackParamList } from '../../types/navigation';
import { Announcement } from '../../types/models';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AdminDashboard() {
  const navigation = useNavigation<NavigationProp>();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false); // Novo estado para upload
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);

  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  
  const [eventForm, setEventForm] = useState({
    title: '',
    event_title: '' as any,
    event_type: '' as any,
    date: '',
    time: '19:30',
    location: '',
    description: '',
    category: 'worship',
    max_attendees: '',
    image_url: ''
  });

  const eventTitles = ['Overnight', 'Guest Fire', 'Table', 'Outside', 'Guest Play', 'Guest Lover'];
  const eventTypes = ['Culto', 'Oração', 'Vigilia', 'Confraternização'];
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateValue, setDateValue] = useState(new Date());

  const [devotionals, setDevotionals] = useState<any[]>([]);
  const [isLoadingDevotionals, setIsLoadingDevotionals] = useState(true);

  const [expandedAvisos, setExpandedAvisos] = useState(false);
  const [expandedEventos, setExpandedEventos] = useState(false);
  const [expandedDevocionais, setExpandedDevocionais] = useState(false);

  const [analytics, setAnalytics] = useState<{
    totalYouth: number;
    activeYouth: number;
    averageAttendance: number;
    devotionalCompletion: number;
    prayerRequests: number;
    answeredPrayers: number;
    upcomingEvents: number;
    weeklyGrowth: number;
    monthlyTrends: { month: string; attendance: number; devotionals: number; prayers: number }[];
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [whatsappCount, setWhatsappCount] = useState('');
  const [whatsappSaving, setWhatsappSaving] = useState(false);

  useEffect(() => {
    loadAnnouncements();
    loadEvents();
    loadDevotionals();
    loadAnalytics();
    loadWhatsappCount();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDevotionals();
      loadAnnouncements();
    }, [])
  );

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await getAdminAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error('Erro ao carregar analytics:', e);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadWhatsappCount = async () => {
    try {
      const val = await getAppSetting('whatsapp_youth_count');
      setWhatsappCount(val ?? '');
    } catch (_) {}
  };

  const saveWhatsappCount = async () => {
    const num = whatsappCount.trim();
    if (num === '') return;
    const n = parseInt(num, 10);
    if (isNaN(n) || n < 0) {
      Alert.alert('Valor inválido', 'Informe um número válido de jovens no grupo do WhatsApp.');
      return;
    }
    setWhatsappSaving(true);
    try {
      await setAppSetting('whatsapp_youth_count', n);
      Alert.alert('Salvo', 'Número do WhatsApp atualizado. Use para comparar com o total no app.');
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível salvar.');
    } finally {
      setWhatsappSaving(false);
    }
  };

  const loadAnnouncements = async () => {
    setIsLoadingAnnouncements(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true) 
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const formattedData = data.map(item => ({
          id: item.id,
          title: item.title,
          message: item.message,
          priority: item.priority,
          isActive: item.is_active,
          createdAt: item.created_at,
          createdBy: item.created_by,
          action_type: item.action_type 
        }));
        setAnnouncements(formattedData);
      }
    } catch (error) {
      console.error('Erro ao buscar avisos:', error);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  const loadEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      if (data) setEvents(data);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const loadDevotionals = async () => {
    setIsLoadingDevotionals(true);
    try {
      const { data, error } = await supabase
        .from('devotionals')
        .select('*')
        .order('date', { ascending: false })
        .limit(20);
      if (error) throw error;
      const list = data ?? [];
      const authorIds = [...new Set(list.map((d: any) => d.author_id).filter(Boolean))] as string[];
      let authorMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, name').in('id', authorIds);
        authorMap = (users ?? []).reduce((acc: Record<string, string>, u: any) => {
          acc[u.id] = u.name || '—';
          return acc;
        }, {});
      }
      setDevotionals(list.map((d: any) => ({ ...d, authorName: (d.author && d.author.trim()) ? d.author.trim() : (d.author_id ? authorMap[d.author_id] ?? '—' : '—') })));
    } catch (error) {
      console.error('Erro ao buscar devocionais:', error);
    } finally {
      setIsLoadingDevotionals(false);
    }
  };

  const handleOpenNewDevotional = () => {
    navigation.navigate('CreateDevotional' as any);
  };

  const handleOpenEditDevotional = (d: any) => {
    navigation.navigate('CreateDevotional' as any, { devotional: d });
  };

  const handleDeleteDevotional = (id: string, title: string) => {
    Alert.alert(
      'Excluir devocional',
      `Deseja realmente excluir "${title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDevotional(id);
              await loadDevotionals();
            } catch (err: any) {
              Alert.alert('Erro', err.message ?? 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate && event.type !== 'dismissed') {
      setDateValue(selectedDate);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setEventForm({ ...eventForm, date: `${year}-${month}-${day}` });
    }
  };

  const handleOpenNewAnnouncement = () => {
    navigation.navigate('CreateAnnouncement' as any);
  };

  const handleOpenEditAnnouncement = (announcement: Announcement) => {
    navigation.navigate('CreateAnnouncement' as any, { announcement });
  };

  const handleDeleteAnnouncement = (id: string, title: string) => {
    Alert.alert(
      'Excluir aviso',
      `Deseja realmente excluir o aviso "${title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('announcements').delete().eq('id', id);
              if (error) throw error;
              await loadAnnouncements();
            } catch (err: any) {
              Alert.alert('Erro', err.message ?? 'Não foi possível excluir o aviso.');
            }
          },
        },
      ]
    );
  };

  const handleOpenNewEvent = () => {
  // Em vez de abrir o modal local, navegamos para a tela de criação
  navigation.navigate('CreateEventScreen' as any); 
};
// --- COLE AQUI (FORA DE OUTRAS FUNÇÕES) ---
const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
  Alert.alert(
    "Excluir Evento",
    `Deseja realmente excluir "${eventTitle}"?`,
    [
      { text: "Cancelar", style: "cancel" },
      { 
        text: "Excluir", 
        style: "destructive", 
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('events')
              .delete()
              .eq('id', eventId);

            if (error) throw error;
            await loadEvents(); 
          } catch (error: any) {
            Alert.alert("Erro", error.message);
          }
        } 
      }
    ]
  );
};


  const handleOpenEditEvent = (event: any) => {
  // Em vez de preencher estados locais e abrir um modal que não existe,
  // enviamos o evento diretamente para a tela de criação
  navigation.navigate('CreateEventScreen' as any, { event: event });
};
  const handleSaveEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.date.trim()) {
        alert("Preencha título e data do evento.");
        return;
    }
    setIsSavingAnnouncement(true); 
    try {
      const payload = {
        ...eventForm,
        max_attendees: eventForm.max_attendees ? parseInt(eventForm.max_attendees) : null
      };
      
      if (editingEvent) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').insert([payload]);
        if (error) throw error;
      }
      await loadEvents();
      setShowEventModal(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await AsyncStorage.clear();
      await signOut();
      // O listener onAuthStateChange no App.tsx irá atualizar o estado e exibir a tela de login
    } catch (error: any) {
      console.error('Erro ao sair:', error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const stats = [
    { label: 'Total de Jovens', value: analytics?.totalYouth ?? '—', icon: Users, color: COLORS.primary, screen: 'UserManagement' as const },
    { label: 'Jovens Ativos', value: analytics?.activeYouth ?? '—', icon: TrendingUp, color: COLORS.success, screen: 'AdminActiveYouth' as const },
    { label: 'Presença Média', value: analytics?.averageAttendance ?? '—', icon: Calendar, color: COLORS.secondary, screen: 'PresençaStack' as const, screenParams: { screen: 'EventPresenceScreen' as const } },
    { label: 'Pedidos de Oração', value: analytics?.prayerRequests ?? '—', icon: Heart, color: COLORS.spiritualOrange, screen: 'AdminPrivatePrayers' as const },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        
        <Gradient colors={[COLORS.gradientStart, COLORS.gradientMiddle]} style={styles.header}>
          <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.navigate('UserTabs')} activeOpacity={0.8}>
            <ArrowLeft size={24} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Painel Administrativo</Text>
            <Text style={styles.headerSubtitle}>Gestão do Ministério de Jovens</Text>
          </View>
          <TouchableOpacity style={styles.headerRightButton} onPress={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? <ActivityIndicator size="small" color="#fff" /> : <LogOut size={22} color="#fff" />}
          </TouchableOpacity>
        </Gradient>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          
          {analyticsLoading ? (
            <View style={styles.statsGrid}><ActivityIndicator color={COLORS.primary} style={{ padding: 24 }} /></View>
          ) : (
            <View style={styles.statsGrid}>
              {stats.map((stat, i) => {
                const CardWrapper = 'screen' in stat && stat.screen ? TouchableOpacity : View;
                const cardProps = 'screen' in stat && stat.screen
                  ? {
                      onPress: () => navigation.navigate(stat.screen as any, 'screenParams' in stat && stat.screenParams ? stat.screenParams : undefined),
                      activeOpacity: 0.7,
                    }
                  : {};
                return (
                  <CardWrapper key={i} style={styles.statCard} {...cardProps}>
                    <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
                      <stat.icon size={20} color={stat.color} />
                    </View>
                    <Text style={styles.statValue} numberOfLines={1}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </CardWrapper>
                );
              })}
            </View>
          )}

          {/* App vs WhatsApp */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>App vs Grupo WhatsApp</Text>
            </View>
            <View style={styles.settingsCard}>
              <View style={styles.settingsInfo}>
                <Users size={24} color={COLORS.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.settingsLabel}>Jovens no app: {analytics?.totalYouth ?? 0}</Text>
                  <Text style={styles.settingsSub}>Compare com o número no grupo de jovens no WhatsApp</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[styles.input, { width: 80, textAlign: 'center' }]}
                  placeholder="Nº"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="number-pad"
                  value={whatsappCount}
                  onChangeText={setWhatsappCount}
                />
                <TouchableOpacity style={[styles.uploadButton, whatsappSaving && { opacity: 0.6 }]} onPress={saveWhatsappCount} disabled={whatsappSaving}>
                  {whatsappSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.uploadButtonText}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </View>
            {whatsappCount !== '' && analytics && !isNaN(parseInt(whatsappCount, 10)) && (
              <Text style={{ marginTop: 8, fontSize: 13, color: COLORS.textSecondary }}>
                {analytics.totalYouth} no app de {parseInt(whatsappCount, 10)} no WhatsApp
                {parseInt(whatsappCount, 10) > 0 && ` (${Math.round((analytics.totalYouth / parseInt(whatsappCount, 10)) * 100)}% no app)`}
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeaderRow} 
              onPress={() => setExpandedAvisos((v) => !v)} 
              activeOpacity={0.8}
            >
              <View style={styles.sectionHeaderLeft}>
                {expandedAvisos ? <ChevronDown size={22} color={COLORS.primary} /> : <ChevronRight size={22} color={COLORS.primary} />}
                <Text style={styles.sectionTitle}>Mural de Avisos</Text>
                {!expandedAvisos && announcements.length > 0 ? (
                  <View style={styles.sectionCountBadge}>
                    <Text style={styles.sectionCountText}>{announcements.length}</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity style={styles.newAnnouncementButton} onPress={(e) => { e?.stopPropagation?.(); handleOpenNewAnnouncement(); }}>
                <Plus size={18} color="#fff" />
                <Text style={styles.newAnnouncementButtonText}>Novo Aviso</Text>
              </TouchableOpacity>
            </TouchableOpacity>
            {expandedAvisos && (
              isLoadingAnnouncements ? (
                <View style={styles.loadingContainer}><ActivityIndicator color={COLORS.primary} /></View>
              ) : (
                announcements.length === 0 ? (
                  <View style={styles.announcementCard}>
                    <Text style={styles.announcementMessage}>Nenhum aviso ainda. Clique em "Novo Aviso" para criar.</Text>
                  </View>
                ) : (
                  announcements.map((announcement) => (
                    <View key={announcement.id} style={styles.announcementCard}>
                      <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => handleOpenEditAnnouncement(announcement)}>
                        <View style={[styles.priorityBadge, { backgroundColor: announcement.priority === 'high' ? COLORS.error : announcement.priority === 'medium' ? COLORS.secondary : COLORS.success }]} />
                        <View style={styles.announcementInfo}>
                          <Text style={styles.announcementTitle}>{announcement.title}</Text>
                          <Text style={styles.announcementMessage} numberOfLines={1}>{announcement.message}</Text>
                        </View>
                        <Edit2 size={16} color={COLORS.primary} style={{ marginRight: 10 }} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteAnnouncement(announcement.id, announcement.title)} style={{ padding: 10 }}>
                        <Trash2 size={18} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  ))
                )
              )
            )}
          </View>

          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeaderRow} 
              onPress={() => setExpandedEventos((v) => !v)} 
              activeOpacity={0.8}
            >
              <View style={styles.sectionHeaderLeft}>
                {expandedEventos ? <ChevronDown size={22} color={COLORS.primary} /> : <ChevronRight size={22} color={COLORS.primary} />}
                <Text style={styles.sectionTitle}>Eventos</Text>
                {!expandedEventos && (() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const upcoming = events.filter((e) => e.date >= today);
                  return upcoming.length > 0 ? (
                    <View style={styles.sectionCountBadge}>
                      <Text style={styles.sectionCountText}>{upcoming.length}</Text>
                    </View>
                  ) : null;
                })()}
              </View>
              <TouchableOpacity style={[styles.newAnnouncementButton, { backgroundColor: COLORS.secondary }]} onPress={(e) => { e?.stopPropagation?.(); handleOpenNewEvent(); }}>
                <Calendar size={18} color="#fff" />
                <Text style={styles.newAnnouncementButtonText}>Novo Evento</Text>
              </TouchableOpacity>
            </TouchableOpacity>
            {expandedEventos && (
              isLoadingEvents ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={COLORS.secondary} />
                </View>
              ) : (() => {
                const today = new Date().toISOString().slice(0, 10);
                const upcoming = events.filter((e) => e.date >= today);
                const past = events.filter((e) => e.date < today);
                const renderEvent = (event: typeof events[0]) => (
                  <View key={event.id} style={styles.eventCard}>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => handleOpenEditEvent(event)}>
                      <View style={styles.eventDateContainer}>
                        <Text style={styles.eventDay}>{new Date(event.date + 'T12:00:00').getDate()}</Text>
                        <Text style={styles.eventMonth}>{new Date(event.date + 'T12:00:00').toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</Text>
                      </View>
                      <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventSub}>{event.event_type} • {event.location}</Text>
                      </View>
                      <Edit2 size={16} color={COLORS.primary} style={{ marginRight: 10 }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteEvent(event.id, event.title)} style={{ padding: 10 }}>
                      <Trash2 size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                );
                return (
                  <>
                    {upcoming.length > 0 && (
                      <View style={styles.eventGroup}>
                        <Text style={styles.eventGroupLabel}>Próximos</Text>
                        {upcoming.map(renderEvent)}
                      </View>
                    )}
                    {past.length > 0 && (
                      <View style={styles.eventGroup}>
                        <Text style={styles.eventGroupLabel}>Realizados</Text>
                        {past.map(renderEvent)}
                      </View>
                    )}
                    {events.length === 0 && (
                      <View style={styles.announcementCard}>
                        <Text style={styles.announcementMessage}>Nenhum evento cadastrado. Clique em "Novo Evento" para criar.</Text>
                      </View>
                    )}
                  </>
                );
              })()
            )}
          </View>

          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeaderRow} 
              onPress={() => setExpandedDevocionais((v) => !v)} 
              activeOpacity={0.8}
            >
              <View style={styles.sectionHeaderLeft}>
                {expandedDevocionais ? <ChevronDown size={22} color={COLORS.primary} /> : <ChevronRight size={22} color={COLORS.primary} />}
                <Text style={styles.sectionTitle}>Devocionais</Text>
                {!expandedDevocionais && devotionals.length > 0 ? (
                  <View style={styles.sectionCountBadge}>
                    <Text style={styles.sectionCountText}>{devotionals.length}</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity style={[styles.newAnnouncementButton, { backgroundColor: COLORS.success }]} onPress={(e) => { e?.stopPropagation?.(); handleOpenNewDevotional(); }}>
                <BookOpen size={18} color="#fff" />
                <Text style={styles.newAnnouncementButtonText}>Novo Devocional</Text>
              </TouchableOpacity>
            </TouchableOpacity>
            {expandedDevocionais && (
              isLoadingDevotionals ? (
                <View style={styles.loadingContainer}><ActivityIndicator color={COLORS.success} /></View>
              ) : devotionals.length === 0 ? (
                <View style={styles.announcementCard}>
                  <Text style={styles.announcementMessage}>Nenhum devocional ainda. Clique em "Novo Devocional" para criar.</Text>
                </View>
              ) : (() => {
                const now = new Date();
                const dayOfWeek = now.getDay();
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() + mondayOffset);
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                const thisWeek: typeof devotionals = [];
                const older: typeof devotionals = [];
                devotionals.forEach((d) => {
                  const dDate = d.date ? new Date(d.date + 'T12:00:00') : null;
                  if (dDate && dDate >= startOfWeek && dDate <= endOfWeek) thisWeek.push(d);
                  else older.push(d);
                });
                const renderDevotional = (d: typeof devotionals[0]) => (
                  <View key={d.id} style={styles.eventCard}>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => handleOpenEditDevotional(d)}>
                      <View style={styles.eventDateContainer}>
                        <Text style={styles.eventDay}>{new Date(d.date + 'T12:00:00').getDate()}</Text>
                        <Text style={styles.eventMonth}>{new Date(d.date + 'T12:00:00').toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</Text>
                      </View>
                      <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle}>{d.title}</Text>
                        <Text style={styles.eventSub}>{getDevotionalCategoryLabel(d.category)} • {d.authorName !== '—' ? d.authorName + ' • ' : ''}{d.scripture?.slice(0, 25)}...</Text>
                      </View>
                      <Edit2 size={16} color={COLORS.primary} style={{ marginRight: 10 }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteDevotional(d.id, d.title)} style={{ padding: 10 }}>
                      <Trash2 size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                );
                return (
                  <>
                    {thisWeek.length > 0 && (
                      <View style={styles.eventGroup}>
                        <Text style={styles.eventGroupLabel}>Devocional da semana</Text>
                        {thisWeek.map(renderDevotional)}
                      </View>
                    )}
                    {older.length > 0 && (
                      <View style={styles.eventGroup}>
                        <Text style={styles.eventGroupLabel}>Devocionais antigos</Text>
                        {older.map(renderDevotional)}
                      </View>
                    )}
                  </>
                );
              })()
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Engajamento</Text>
            <View style={styles.analyticsCard}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('AdminDevotionalCompletions' as any)}>
                <ProgressCard title="Conclusão de Devocionais (esta semana)" progress={analytics?.devotionalCompletion ?? 0} color={COLORS.secondary} subtitle={`${analytics?.devotionalCompletion ?? 0}% dos jovens fizeram ao menos 1 devocional • Toque para ver a lista`} />
              </TouchableOpacity>
              <View style={styles.analyticsDivider} />
              <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('PresençaStack' as any, { screen: 'EventPresenceScreen' })}>
                <ProgressCard title="Presença Média por Evento" progress={Math.min(100, (analytics?.averageAttendance ?? 0) * 2)} color={COLORS.primary} subtitle={`${analytics?.averageAttendance ?? 0} check-ins em média por evento • Toque para ver presenças`} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
  <Text style={styles.sectionTitle}>Ações Rápidas</Text>
  <View style={styles.quickActionsGrid}>
    {[
      { label: 'Ler QR Code', icon: QrCode, color: COLORS.primary, screen: 'QRCodeScanner' },
      { label: 'Departamentos', icon: LayoutGrid, color: '#0EA5E9', screen: 'DepartmentsList' },
      { label: 'Enviar Notificação', icon: Bell, color: COLORS.secondary, screen: 'NotificationScreen' },
      { label: 'Relatórios', icon: BookOpen, color: COLORS.success, screen: 'AnalyticsScreen' },
      { label: 'Presença Eventos', icon: Users, color: '#10B981', screen: 'PresençaStack' as const, screenParams: { screen: 'EventPresenceScreen' } },
      { label: 'Visitantes', icon: User, color: '#F59E0B', screen: 'PresençaStack' as const, screenParams: { screen: 'VisitorsControlScreen' } },
      { label: 'Versículos', icon: BookOpen, color: '#0EA5E9', screen: 'Versiculos' },
      { label: 'Usuários', icon: Users, color: '#8B5CF6', screen: 'UserManagement' },
      { label: 'Pedidos privados', icon: Lock, color: COLORS.primary, screen: 'AdminPrivatePrayers' },
      { label: 'Configurações', icon: Settings, color: '#6B7280', screen: 'AppSettings' },
      { label: 'Identidade da igreja', icon: Palette, color: '#EC4899', screen: 'ChurchBrandingSettings' },
      { label: 'Conquistas', icon: BookOpen, color: '#EAB308', screen: 'AdminAchievements' },
    ].map((action, i) => (
      <TouchableOpacity 
        key={i} 
        style={styles.quickActionCard}
        onPress={() => action.screen && navigation.navigate(action.screen as any, ('screenParams' in action ? action.screenParams : undefined))}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
          <action.icon size={22} color={action.color} />
        </View>
        <Text style={styles.quickActionLabel}>{action.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
</View>
        </ScrollView>
      </Animated.View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: SPACING.LG, paddingBottom: SPACING.XL + 10, paddingHorizontal: SPACING.LG, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBackButton: { padding: 8, marginRight: 8 },
  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...TYPOGRAPHY.h2, color: '#fff', textAlign: 'center' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 2 },
  headerRightButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.LG, paddingBottom: 100, backgroundColor: COLORS.background },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.MD, marginBottom: SPACING.XL },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: SPACING.MD, borderRadius: BORDER_RADIUS.LG, overflow: 'hidden', ...SHADOWS.small },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.SM },
  statValue: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },
  statLabel: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  section: { marginBottom: SPACING.XL },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.MD },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.MD },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },
  sectionCountBadge: { backgroundColor: COLORS.primary, minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  sectionCountText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  newAnnouncementButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, minWidth: 160, paddingHorizontal: SPACING.MD, paddingVertical: 10, borderRadius: BORDER_RADIUS.MD, gap: 6 },
  newAnnouncementButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  announcementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: SPACING.MD, borderRadius: BORDER_RADIUS.LG, marginBottom: SPACING.SM, ...SHADOWS.small },
  priorityBadge: { width: 4, height: 35, borderRadius: 2, marginRight: SPACING.MD },
  announcementInfo: { flex: 1 },
  announcementTitle: { ...TYPOGRAPHY.body, fontWeight: '700', color: COLORS.textPrimary },
  announcementMessage: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  eventGroup: { marginBottom: SPACING.LG },
  eventGroupLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.SM },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: SPACING.MD, borderRadius: BORDER_RADIUS.LG, marginBottom: SPACING.SM, ...SHADOWS.small },
  eventDateContainer: { width: 50, alignItems: 'center', borderRightWidth: 1, borderRightColor: COLORS.border, marginRight: SPACING.MD },
  eventDay: { ...TYPOGRAPHY.h3, color: COLORS.secondary, lineHeight: 24 },
  eventMonth: { fontSize: 10, fontWeight: 'bold', color: COLORS.textSecondary },
  eventInfo: { flex: 1 },
  eventTitle: { ...TYPOGRAPHY.body, fontWeight: '700', color: COLORS.textPrimary },
  eventSub: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  analyticsCard: { backgroundColor: '#fff', padding: SPACING.LG, borderRadius: BORDER_RADIUS.LG, overflow: 'hidden', ...SHADOWS.small },
  analyticsDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.LG },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.MD },
  quickActionCard: { width: '47%', backgroundColor: '#fff', padding: SPACING.MD, borderRadius: BORDER_RADIUS.LG, alignItems: 'center', ...SHADOWS.small },
  quickActionIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.SM },
  quickActionLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: BORDER_RADIUS.LG, borderTopRightRadius: BORDER_RADIUS.LG, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: SPACING.LG },
  modalTitle: { ...TYPOGRAPHY.h3, color: '#fff' },
  modalScrollView: { padding: SPACING.LG },
  inputLabel: { fontWeight: '600', marginTop: SPACING.MD, marginBottom: SPACING.SM },
  input: { ...globalStyles.input },
  textArea: { height: 100, textAlignVertical: 'top' },
  priorityGrid: { flexDirection: 'row', gap: SPACING.SM },
  priorityChip: { flex: 1, padding: SPACING.SM, borderRadius: BORDER_RADIUS.MD, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  priorityText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: SPACING.SM, marginTop: SPACING.XL, marginBottom: SPACING.XL },
  deleteButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${COLORS.error}20`, padding: SPACING.MD, borderRadius: BORDER_RADIUS.MD },
  deleteButtonText: { color: COLORS.error, fontWeight: '600', marginLeft: 5 },
  saveButton: { flex: 1, backgroundColor: COLORS.primary, padding: SPACING.MD, borderRadius: BORDER_RADIUS.MD, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '700' },
  loadingContainer: { padding: 20, alignItems: 'center' },
  // Estilos da nova seção de Configurações
  settingsCard: { backgroundColor: '#fff', padding: SPACING.MD, borderRadius: BORDER_RADIUS.LG, ...SHADOWS.small, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingsLabel: { ...TYPOGRAPHY.body, fontWeight: '700', color: COLORS.textPrimary },
  settingsSub: { fontSize: 11, color: COLORS.textSecondary },
  uploadButton: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 5 },
  uploadButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});