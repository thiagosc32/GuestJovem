import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  Alert as RNAlert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Alert = RNAlert ?? {
  alert: (title: string, message?: string, buttons?: Array<{ text: string; onPress?: () => void; style?: string }>) => {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert([title, message].filter(Boolean).join('\n'));
      buttons?.find((b) => b.onPress)?.onPress?.();
    }
  },
};
import { supabase, createEventRSVP } from '../../services/supabase';
import { awardXp } from '../../services/spiritualJourney';
import { notifyAchievementUnlockIfNew } from '../../services/achievementsService';

import EventCard from '../../components/EventCard';
import Gradient from '../../components/ui/Gradient';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { SHADOWS } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

/** Considera evento passado se a data+hora de início já foi (horário local). */
function isEventPast(event: { date?: string; time?: string }): boolean {
  if (!event?.date) return true;
  const [y, m, d] = event.date.split('-').map(Number);
  const timeStr = (event.time || '00:00').trim();
  const [hh, mm] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  const eventStart = new Date(y, (m || 1) - 1, d || 1, hh, mm, 0, 0);
  return eventStart.getTime() < Date.now();
}

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'Culto', label: 'Culto' },
  { id: 'Oração', label: 'Oração' },
  { id: 'Vigília', label: 'Vigília' },
  { id: 'Confraternização', label: 'Confraternização' },
];

export default function EventsScreen() {
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [confirmedEvents, setConfirmedEvents] = useState<string[]>([]);
  const [heroImage, setHeroImage] = useState('https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?auto=format&fit=crop&q=80');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => { 
    fetchEvents(); 
    fetchHeroImage(); 
  }, []);

  const fetchHeroImage = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'events_hero_image')
        .single();
      
      if (data?.value) setHeroImage(data.value);
    } catch (error) {
      console.error('Erro ao carregar imagem de fundo:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true });
      if (error) throw error;
      setEvents(data || []);
      
      // Busca as presenças já confirmadas pelo usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: rsvps } = await supabase.from('event_rsvps').select('event_id').eq('user_id', user.id);
        if (rsvps) setConfirmedEvents(rsvps.map(r => r.event_id));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }
  };

  // Confirmar presença (inserir RSVP) e conceder XP da Jornada Espiritual
  const doConfirmPresence = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await createEventRSVP(eventId, user.id);
    setConfirmedEvents((prev) => [...prev, eventId]);
    try {
      await awardXp(user.id, 'event_checkin', { referenceId: eventId, referenceType: 'event' });
      notifyAchievementUnlockIfNew(user.id, 'event_checkins').catch(() => {});
    } catch (_) {}
  };

  // Cancelar presença (remover RSVP)
  const doCancelPresence = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', user.id);
    if (error) throw error;
    setConfirmedEvents((prev) => prev.filter((id) => id !== eventId));
  };

  // Handler do botão: mostra confirmação ou cancelamento antes de executar
  const handleConfirmPresence = async (eventId: string, isConfirmed: boolean, requiresRegistration: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Atenção', 'Você precisa estar logado para confirmar presença.');
      return;
    }
    if (requiresRegistration) {
      navigation.navigate('RegistrationScreen', {
        eventId,
        onSuccess: () => setConfirmedEvents((prev) => [...prev, eventId]),
      });
      return;
    }
    if (isConfirmed) {
      Alert.alert(
        'Cancelar presença',
        'Deseja cancelar sua presença nesse evento?',
        [
          { text: 'Não', style: 'cancel' },
          { text: 'Sim', onPress: () => doCancelPresence(eventId).catch((e: any) => Alert.alert('Erro', e?.message || 'Não foi possível cancelar.')) },
        ]
      );
    } else {
      Alert.alert(
        'Confirmar presença',
        'Você deseja confirmar a presença nesse evento?',
        [
          { text: 'Não', style: 'cancel' },
          { text: 'Sim', onPress: () => doConfirmPresence(eventId).catch((e: any) => Alert.alert('Erro', e?.message || 'Não foi possível confirmar.')) },
        ]
      );
    }
  };

const filteredEvents = (events || [])
  .filter((event) => !isEventPast(event))
  .filter((event) => {
    if (filter === 'all') return true;
    const type = (event.event_type || event.category || '').trim();
    return type === filter;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <Animated.View style={[styles.heroContainer, { transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 250], outputRange: [0, -50], extrapolate: 'clamp' }) }] }]}>
        <ImageBackground source={{ uri: heroImage }} style={styles.heroImage}>
          <Gradient colors={[`${COLORS.gradientStart}20`, `${COLORS.primaryDark}E6`]} style={styles.heroOverlay} />
        </ImageBackground>
      </Animated.View>

      <SafeAreaView style={styles.fixedHeader} edges={['top']}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.titleText}>Eventos</Text>
            <Text style={styles.subtitleText}>Guest Jovem</Text>
          </View>
        </View>
      </SafeAreaView>

      <Animated.ScrollView 
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        contentContainerStyle={styles.scrollBody}
        scrollEventThrottle={16}
      >
        <View style={styles.heroSpacer} />

        <View style={styles.filtersWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPadding}>
            {CATEGORIES.map((cat) => {
              const isActive = filter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setFilter(cat.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.mainSurface}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
          ) : (
            <Animated.View style={[styles.eventsList, { opacity: fadeAnim }]}>
             {filteredEvents.map((event) => (
  <EventCard 
    key={event.id} 
    event={event} 
    isConfirmed={confirmedEvents.includes(event.id)} 
    onConfirm={() => {
      const isConfirmed = confirmedEvents.includes(event.id);
      handleConfirmPresence(event.id, isConfirmed, !!event.requires_registration);
    }} 
  />
))}

{filteredEvents.length === 0 && (
  <Text style={styles.emptyText}>Nenhum evento encontrado.</Text>
)}
<View style={{ height: 100 }} />
            </Animated.View>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryDark },
  heroContainer: { position: 'absolute', width: width, height: 280, top: 0 },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { flex: 1 },
  fixedHeader: { position: 'absolute', zIndex: 100, width: '100%' },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.LG, paddingTop: SPACING.SM, gap: SPACING.MD },
  titleText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitleText: { fontSize: 15, color: 'rgba(255,255,255,0.75)' },
  scrollBody: { flexGrow: 1 },
  heroSpacer: { height: 200 },
  filtersWrapper: { zIndex: 110, marginBottom: -SPACING.LG },
  filterPadding: { paddingHorizontal: SPACING.LG, gap: 10, paddingBottom: SPACING.LG, paddingTop: 2 },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.small,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  mainSurface: { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, minHeight: height, paddingHorizontal: SPACING.LG, paddingTop: SPACING.LG },
  eventsList: { width: '100%' },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 48, fontSize: 16 },
});