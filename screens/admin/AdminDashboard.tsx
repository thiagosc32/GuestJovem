import { supabase, createDevotional } from '../../services/supabase';
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
  Plus, Megaphone, Edit2, Trash2, X, Settings, Image as ImageIcon, User, Lock 
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
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
import { mockAnalytics } from '../../data/mockData';
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
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  
  const [announcementForm, setAnnouncementForm] = useState({ 
    title: '', 
    message: '', 
    priority: 'medium' as 'high' | 'medium' | 'low',
    action_type: 'none' 
  });
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

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
  const [showDevotionalModal, setShowDevotionalModal] = useState(false);
  const [editingDevotional, setEditingDevotional] = useState<any | null>(null);
  const [isSavingDevotional, setIsSavingDevotional] = useState(false);
  const [devotionalForm, setDevotionalForm] = useState({
    title: '',
    date: '',
    category: 'faith' as 'faith' | 'love' | 'hope' | 'courage' | 'wisdom',
    scripture: '',
    content: '',
    reflection: '',
    prayerPoints: '',
    author: '',
  });

  useEffect(() => {
    loadAnnouncements();
    loadEvents();
    loadDevotionals();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, []);

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
    setEditingDevotional(null);
    const today = new Date().toISOString().split('T')[0];
    setDevotionalForm({
      title: '',
      date: today,
      category: 'faith',
      scripture: '',
      content: '',
      reflection: '',
      prayerPoints: '',
      author: '',
    });
    setShowDevotionalModal(true);
  };

  const handleOpenEditDevotional = (d: any) => {
    setEditingDevotional(d);
    const authorText = (d.author && String(d.author).trim()) ? String(d.author).trim() : (d.authorName !== '—' ? d.authorName : '');
    setDevotionalForm({
      title: d.title ?? '',
      date: d.date ?? '',
      category: d.category ?? 'faith',
      scripture: d.scripture ?? '',
      content: d.content ?? '',
      reflection: d.reflection ?? '',
      prayerPoints: Array.isArray(d.prayer_points) ? d.prayer_points.join('\n') : '',
      author: authorText,
    });
    setShowDevotionalModal(true);
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
              const { error } = await supabase.from('devotionals').delete().eq('id', id);
              if (error) throw error;
              await loadDevotionals();
              if (editingDevotional?.id === id) {
                setShowDevotionalModal(false);
                setEditingDevotional(null);
              }
            } catch (err: any) {
              Alert.alert('Erro', err.message ?? 'Não foi possível excluir.');
            }
          },
        },
      ]
    );
  };

  const handleSaveDevotional = async () => {
    if (!devotionalForm.title.trim() || !devotionalForm.date.trim() || !devotionalForm.scripture.trim() || !devotionalForm.content.trim() || !devotionalForm.reflection.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha título, data, escritura, conteúdo e reflexão.');
      return;
    }
    setIsSavingDevotional(true);
    try {
      const prayerPointsArray = devotionalForm.prayerPoints
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p !== '');
      const payload = {
        title: devotionalForm.title.trim(),
        date: devotionalForm.date.trim(),
        category: devotionalForm.category,
        scripture: devotionalForm.scripture.trim(),
        content: devotionalForm.content.trim(),
        reflection: devotionalForm.reflection.trim(),
        prayer_points: prayerPointsArray,
        author: devotionalForm.author.trim() || null,
      };
      if (editingDevotional) {
        const { error } = await supabase.from('devotionals').update(payload).eq('id', editingDevotional.id);
        if (error) throw error;
        Alert.alert('Sucesso', 'Devocional atualizado com sucesso.');
      } else {
        await createDevotional({
          ...payload,
          author_id: null,
        });
        Alert.alert('Sucesso', 'Devocional criado com sucesso.');
      }
      await loadDevotionals();
      setShowDevotionalModal(false);
      setEditingDevotional(null);
    } catch (error: any) {
      Alert.alert('Erro', error.message ?? 'Não foi possível salvar o devocional.');
    } finally {
      setIsSavingDevotional(false);
    }
  };

  // FUNÇÃO PARA ALTERAR A IMAGEM DE FUNDO (NOVA)
  const handleUpdateHeroImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      try {
        setIsUploading(true);
        const file = result.assets[0];
        const fileName = `events-bg-${Date.now()}.jpg`;
        const filePath = `hero/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(filePath, decode(file.base64!), {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('assets')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('app_settings')
          .update({ value: publicUrl })
          .eq('key', 'events_hero_image');

        if (dbError) throw dbError;

        alert('Imagem de fundo atualizada com sucesso!');
      } catch (error: any) {
        alert('Erro ao atualizar imagem: ' + error.message);
      } finally {
        setIsUploading(false);
      }
    }
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
    setEditingAnnouncement(null);
    setAnnouncementForm({ title: '', message: '', priority: 'medium', action_type: 'none' });
    setShowAnnouncementModal(true);
  };

  const handleOpenEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      message: announcement.message,
      priority: announcement.priority,
      action_type: announcement.action_type || 'none'
    });
    setShowAnnouncementModal(true);
  };

  const handleSaveAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha o título e a mensagem.');
      return;
    }
    setIsSavingAnnouncement(true);
    try {
      if (editingAnnouncement) {
        const { error } = await supabase.from('announcements').update({
          title: announcementForm.title,
          message: announcementForm.message,
          priority: announcementForm.priority,
          action_type: announcementForm.action_type
        }).eq('id', editingAnnouncement.id);
        if (error) throw error;
        Alert.alert('Sucesso', 'Aviso atualizado com sucesso.');
      } else {
        const { error } = await supabase.from('announcements').insert([{
          title: announcementForm.title,
          message: announcementForm.message,
          priority: announcementForm.priority,
          action_type: announcementForm.action_type,
          is_active: true
        }]);
        if (error) throw error;
        Alert.alert('Sucesso', 'Aviso criado com sucesso.');
      }
      await loadAnnouncements();
      setShowAnnouncementModal(false);
      setEditingAnnouncement(null);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setIsSavingAnnouncement(false);
    }
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
              if (editingAnnouncement?.id === id) {
                setShowAnnouncementModal(false);
                setEditingAnnouncement(null);
              }
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
      await supabase.auth.signOut();
      // O listener onAuthStateChange no App.tsx irá atualizar o estado e exibir a tela de login
    } catch (error: any) {
      console.error('Erro ao sair:', error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const stats = [
    { label: 'Total de Jovens', value: mockAnalytics.totalYouth, icon: Users, color: COLORS.primary },
    { label: 'Jovens Ativos', value: mockAnalytics.activeYouth, icon: TrendingUp, color: COLORS.success },
    { label: 'Presença Média', value: mockAnalytics.averageAttendance, icon: Calendar, color: COLORS.secondary },
    { label: 'Pedidos de Oração', value: mockAnalytics.prayerRequests, icon: Heart, color: COLORS.spiritualOrange },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        
        <Gradient colors={[COLORS.gradientStart, COLORS.gradientMiddle]} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Painel Administrativo</Text>
              <Text style={styles.subtitle}>Gestão do Ministério de Jovens</Text>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('UserTabs')}>
                <User size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? <ActivityIndicator size="small" color="#fff" /> : <LogOut size={22} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        </Gradient>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.statsGrid}>
            {stats.map((stat, i) => (
              <View key={i} style={styles.statCard}>
                <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
                  <stat.icon size={20} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* NOVA SEÇÃO: CONFIGURAÇÕES DA PÁGINA EVENTS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Configurações da Página Events</Text>
              <Settings size={20} color={COLORS.textSecondary} />
            </View>
            <View style={styles.settingsCard}>
              <View style={styles.settingsInfo}>
                <ImageIcon size={24} color={COLORS.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.settingsLabel}>Imagem de Banner</Text>
                  <Text style={styles.settingsSub}>Altera a foto principal da tela de eventos</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.uploadButton, isUploading && { opacity: 0.6 }]} 
                onPress={handleUpdateHeroImage}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Plus size={16} color="#fff" />
                    <Text style={styles.uploadButtonText}>Trocar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mural de Avisos</Text>
              <TouchableOpacity style={styles.newAnnouncementButton} onPress={handleOpenNewAnnouncement}>
                <Plus size={18} color="#fff" />
                <Text style={styles.newAnnouncementButtonText}>Novo Aviso</Text>
              </TouchableOpacity>
            </View>
            {isLoadingAnnouncements ? (
              <View style={styles.loadingContainer}><ActivityIndicator color={COLORS.primary} /></View>
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
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Eventos e Atividades</Text>
              <TouchableOpacity style={[styles.newAnnouncementButton, { backgroundColor: COLORS.secondary }]} onPress={handleOpenNewEvent}>
                <Calendar size={18} color="#fff" />
                <Text style={styles.newAnnouncementButtonText}>Novo Evento</Text>
              </TouchableOpacity>
            </View>
            {isLoadingEvents ? (
  <View style={styles.loadingContainer}>
    <ActivityIndicator color={COLORS.secondary} />
  </View>
) : (
  events.map((event) => (
    <View key={event.id} style={styles.eventCard}>
      {/* Lado Esquerdo: Clique para Editar */}
      <TouchableOpacity 
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} 
        onPress={() => handleOpenEditEvent(event)}
      >
        <View style={styles.eventDateContainer}>
          <Text style={styles.eventDay}>
            {new Date(event.date + 'T12:00:00').getDate()}
          </Text>
          <Text style={styles.eventMonth}>
            {new Date(event.date + 'T12:00:00').toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}
          </Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventSub}>{event.event_type} • {event.location}</Text>
        </View>
        <Edit2 size={16} color={COLORS.primary} style={{ marginRight: 10 }} />
      </TouchableOpacity>

      {/* Lado Direito: Clique para Excluir */}
      <TouchableOpacity 
        onPress={() => handleDeleteEvent(event.id, event.title)}
        style={{ padding: 10 }}
      >
        <Trash2 size={18} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  ))
)}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Devocionais</Text>
              <TouchableOpacity style={[styles.newAnnouncementButton, { backgroundColor: COLORS.success }]} onPress={handleOpenNewDevotional}>
                <BookOpen size={18} color="#fff" />
                <Text style={styles.newAnnouncementButtonText}>Novo Devocional</Text>
              </TouchableOpacity>
            </View>
            {isLoadingDevotionals ? (
              <View style={styles.loadingContainer}><ActivityIndicator color={COLORS.success} /></View>
            ) : devotionals.length === 0 ? (
              <View style={styles.announcementCard}>
                <Text style={styles.announcementMessage}>Nenhum devocional ainda. Clique em "Novo Devocional" para criar.</Text>
              </View>
            ) : (
              devotionals.slice(0, 10).map((d) => (
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
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Engajamento</Text>
            <View style={styles.analyticsCard}>
              <ProgressCard title="Conclusão de Devocionais" progress={mockAnalytics.devotionalCompletion} color={COLORS.secondary} />
              <View style={styles.analyticsDivider} />
              <ProgressCard title="Presença em Células" progress={mockAnalytics.cellGroupAttendance} color={COLORS.primary} />
            </View>
          </View>

          <View style={styles.section}>
  <Text style={styles.sectionTitle}>Ações Rápidas</Text>
  <View style={styles.quickActionsGrid}>
    {[
      { label: 'Gerar QR Code', icon: QrCode, color: COLORS.primary, screen: 'QRCodeScanner' },
      { label: 'Enviar Notificação', icon: Bell, color: COLORS.secondary, screen: 'NotificationScreen' },
      { label: 'Relatórios', icon: BookOpen, color: COLORS.success, screen: 'AnalyticsScreen' },
      { label: 'Avisos App', icon: Megaphone, color: COLORS.spiritualOrange, screen: 'NotificationScreen' },
      { label: 'Presença Eventos', icon: Users, color: '#10B981', screen: 'EventPresenceScreen' },
      { label: 'Usuários', icon: Users, color: '#8B5CF6', screen: 'UserManagement' },
      { label: 'Pedidos privados', icon: Lock, color: COLORS.primary, screen: 'AdminPrivatePrayers' },
      { label: 'Configurações', icon: Settings, color: '#6B7280', screen: 'AppSettings' },
    ].map((action, i) => (
      <TouchableOpacity 
        key={i} 
        style={styles.quickActionCard}
        onPress={() => action.screen && navigation.navigate(action.screen as any)}
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

      {/* MODAL DE AVISOS */}
      <Modal visible={showAnnouncementModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <Gradient colors={[COLORS.primary, COLORS.gradientMiddle]} style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingAnnouncement ? 'Editar Aviso' : 'Novo Aviso'}</Text>
                <TouchableOpacity onPress={() => setShowAnnouncementModal(false)}><X size={24} color="#fff" /></TouchableOpacity>
              </Gradient>
              <ScrollView style={styles.modalScrollView}>
                <Text style={styles.inputLabel}>Título do Aviso</Text>
                <TextInput style={styles.input} placeholder="Ex: Reunião de Líderes" value={announcementForm.title} onChangeText={(text) => setAnnouncementForm({...announcementForm, title: text})} />
                <Text style={styles.inputLabel}>Mensagem</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Escreva o conteúdo..." multiline numberOfLines={4} value={announcementForm.message} onChangeText={(text) => setAnnouncementForm({...announcementForm, message: text})} />
                <Text style={styles.inputLabel}>Prioridade</Text>
                <View style={styles.priorityGrid}>
                  {['low', 'medium', 'high'].map((p) => (
                    <TouchableOpacity key={p} style={[styles.priorityChip, announcementForm.priority === p && { backgroundColor: p === 'high' ? COLORS.error : p === 'medium' ? COLORS.secondary : COLORS.success, borderColor: 'transparent' }]} onPress={() => setAnnouncementForm({...announcementForm, priority: p as any})}>
                      <Text style={[styles.priorityText, announcementForm.priority === p && { color: '#fff' }]}>{p === 'low' ? 'Baixa' : p === 'medium' ? 'Média' : 'Alta'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.inputLabel}>Ação ao Clicar</Text>
                <View style={[styles.priorityGrid, { flexWrap: 'wrap' }]}>
                  {[{ label: 'Nenhum', value: 'none' }, { label: 'Eventos', value: 'events' }, { label: 'Oração', value: 'prayer' }, { label: 'Devocional', value: 'devotional' }].map((action) => (
                    <TouchableOpacity key={action.value} style={[styles.priorityChip, { width: '47%', marginBottom: 8 }, announcementForm.action_type === action.value && { backgroundColor: COLORS.primary, borderColor: 'transparent' }]} onPress={() => setAnnouncementForm({...announcementForm, action_type: action.value})}>
                      <Text style={[styles.priorityText, announcementForm.action_type === action.value && { color: '#fff' }]}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.modalButtons}>
                  {editingAnnouncement && (
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteAnnouncement(editingAnnouncement.id, editingAnnouncement.title)}>
                      <Trash2 size={20} color={COLORS.error} /><Text style={styles.deleteButtonText}>Excluir</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveAnnouncement} disabled={isSavingAnnouncement}>
                    {isSavingAnnouncement ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Salvar Aviso</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL CRIAR/EDITAR DEVOCIONAL */}
      <Modal visible={showDevotionalModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <Gradient colors={[COLORS.success, COLORS.secondary]} style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingDevotional ? 'Editar Devocional' : 'Novo Devocional'}</Text>
                <TouchableOpacity onPress={() => { setShowDevotionalModal(false); setEditingDevotional(null); }}><X size={24} color="#fff" /></TouchableOpacity>
              </Gradient>
              <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
                <Text style={styles.inputLabel}>Autor</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome do autor do devocional"
                  placeholderTextColor={COLORS.textSecondary}
                  value={devotionalForm.author}
                  onChangeText={(t) => setDevotionalForm({ ...devotionalForm, author: t })}
                />
                <Text style={styles.inputLabel}>Título *</Text>
                <TextInput style={styles.input} placeholder="Ex: Caminhando pela Fé" placeholderTextColor={COLORS.textSecondary} value={devotionalForm.title} onChangeText={(t) => setDevotionalForm({ ...devotionalForm, title: t })} />
                <Text style={styles.inputLabel}>Data (AAAA-MM-DD) *</Text>
                <TextInput style={styles.input} placeholder="2025-02-22" placeholderTextColor={COLORS.textSecondary} value={devotionalForm.date} onChangeText={(t) => setDevotionalForm({ ...devotionalForm, date: t })} />
                <Text style={styles.inputLabel}>Categoria *</Text>
                <View style={[styles.priorityGrid, { flexWrap: 'wrap' }]}>
                  {[
                    { value: 'faith' as const, label: 'Fé' },
                    { value: 'love' as const, label: 'Amor' },
                    { value: 'hope' as const, label: 'Esperança' },
                    { value: 'courage' as const, label: 'Coragem' },
                    { value: 'wisdom' as const, label: 'Sabedoria' },
                  ].map((cat) => (
                    <TouchableOpacity key={cat.value} style={[styles.priorityChip, devotionalForm.category === cat.value && { backgroundColor: COLORS.success, borderColor: 'transparent' }]} onPress={() => setDevotionalForm({ ...devotionalForm, category: cat.value })}>
                      <Text style={[styles.priorityText, devotionalForm.category === cat.value && { color: '#fff' }]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.inputLabel}>Escritura *</Text>
                <TextInput style={styles.input} placeholder="Ex: Hebreus 11:1" placeholderTextColor={COLORS.textSecondary} value={devotionalForm.scripture} onChangeText={(t) => setDevotionalForm({ ...devotionalForm, scripture: t })} />
                <Text style={styles.inputLabel}>Conteúdo *</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Conteúdo do devocional..." placeholderTextColor={COLORS.textSecondary} value={devotionalForm.content} onChangeText={(t) => setDevotionalForm({ ...devotionalForm, content: t })} multiline numberOfLines={4} textAlignVertical="top" />
                <Text style={styles.inputLabel}>Reflexão *</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Pergunta para reflexão..." placeholderTextColor={COLORS.textSecondary} value={devotionalForm.reflection} onChangeText={(t) => setDevotionalForm({ ...devotionalForm, reflection: t })} multiline numberOfLines={3} textAlignVertical="top" />
                <Text style={styles.inputLabel}>Pontos de Oração (opcional, um por linha)</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Ore por força\nOre por sabedoria" placeholderTextColor={COLORS.textSecondary} value={devotionalForm.prayerPoints} onChangeText={(t) => setDevotionalForm({ ...devotionalForm, prayerPoints: t })} multiline numberOfLines={3} textAlignVertical="top" />
                <View style={styles.modalButtons}>
                  {editingDevotional && (
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteDevotional(editingDevotional.id, editingDevotional.title)}>
                      <Trash2 size={20} color={COLORS.error} /><Text style={styles.deleteButtonText}>Excluir</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveDevotional} disabled={isSavingDevotional}>
                    {isSavingDevotional ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{editingDevotional ? 'Salvar alterações' : 'Criar Devocional'}</Text>}
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
  container: { flex: 1 },
  header: { padding: SPACING.LG, paddingBottom: SPACING.XL + 10 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerButtons: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  greeting: { ...TYPOGRAPHY.h2, color: '#fff' },
  subtitle: { ...TYPOGRAPHY.body, color: 'rgba(255,255,255,0.8)' },
  headerButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1, marginTop: -20 },
  scrollContent: { padding: SPACING.LG, paddingBottom: 100 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.MD, marginBottom: SPACING.XL },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: SPACING.MD, borderRadius: BORDER_RADIUS.LG, ...SHADOWS.small },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.SM },
  statValue: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },
  statLabel: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  section: { marginBottom: SPACING.XL },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.MD },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.textPrimary },
  newAnnouncementButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: SPACING.MD, paddingVertical: 8, borderRadius: BORDER_RADIUS.MD, gap: 5 },
  newAnnouncementButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  announcementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: SPACING.MD, borderRadius: BORDER_RADIUS.LG, marginBottom: SPACING.SM, ...SHADOWS.small },
  priorityBadge: { width: 4, height: 35, borderRadius: 2, marginRight: SPACING.MD },
  announcementInfo: { flex: 1 },
  announcementTitle: { ...TYPOGRAPHY.body, fontWeight: '700', color: COLORS.textPrimary },
  announcementMessage: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: SPACING.MD, borderRadius: BORDER_RADIUS.LG, marginBottom: SPACING.SM, ...SHADOWS.small },
  eventDateContainer: { width: 50, alignItems: 'center', borderRightWidth: 1, borderRightColor: COLORS.border, marginRight: SPACING.MD },
  eventDay: { ...TYPOGRAPHY.h3, color: COLORS.secondary, lineHeight: 24 },
  eventMonth: { fontSize: 10, fontWeight: 'bold', color: COLORS.textSecondary },
  eventInfo: { flex: 1 },
  eventTitle: { ...TYPOGRAPHY.body, fontWeight: '700', color: COLORS.textPrimary },
  eventSub: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary },
  analyticsCard: { backgroundColor: '#fff', padding: SPACING.LG, borderRadius: BORDER_RADIUS.LG, ...SHADOWS.small },
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