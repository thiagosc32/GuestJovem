import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, StyleSheet, 
  Animated, StatusBar, ActivityIndicator, Dimensions, ImageBackground,
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
import { Calendar, Sparkles } from 'lucide-react-native';
import { supabase } from '../../services/supabase';

import EventCard from '../../components/EventCard';
import Gradient from '../../components/ui/Gradient';
import { COLORS } from '../../constants/colors';
import { SHADOWS } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

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

  // Confirmar presença (inserir RSVP)
  const doConfirmPresence = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('event_rsvps')
      .insert({ event_id: eventId, user_id: user.id, status: 'confirmed' });
    if (error) throw error;
    setConfirmedEvents((prev) => [...prev, eventId]);
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

const filteredEvents = (events || []).filter(event => {
  if (filter === 'all') return true;
  // Garante que o filtro funcione tanto com 'event_type' quanto 'category'
  const type = (event.event_type || event.category || '').trim();
  return type === filter;
});

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <Animated.View style={[styles.heroContainer, { transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 250], outputRange: [0, -50], extrapolate: 'clamp' }) }] }]}>
        <ImageBackground source={{ uri: heroImage }} style={styles.heroImage}>
          <Gradient colors={['rgba(15, 23, 42, 0.2)', 'rgba(15, 23, 42, 0.95)']} style={styles.heroOverlay} />
        </ImageBackground>
      </Animated.View>

      <SafeAreaView style={styles.fixedHeader} edges={['top']}>
        <View style={styles.headerContent}>
          <View>
            <View style={styles.row}>
              <Text style={styles.titleText}>Eventos</Text>
              <Sparkles size={20} color="#FFD700" style={{ marginLeft: 8 }} />
            </View>
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
            {CATEGORIES.map((cat) => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.chip, filter === cat.id && styles.chipActive]} 
                onPress={() => setFilter(cat.id)}
              >
                <Text style={[styles.chipText, filter === cat.id && styles.chipTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
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
  container: { flex: 1, backgroundColor: '#0F172A' },
  heroContainer: { position: 'absolute', width: width, height: 300, top: 0 },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { flex: 1 },
  fixedHeader: { position: 'absolute', zIndex: 100, width: '100%' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 10 },
  titleText: { fontSize: 32, fontWeight: '900', color: '#fff' },
  subtitleText: { fontSize: 16, color: 'rgba(255,255,255,0.6)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  scrollBody: { flexGrow: 1 },
  heroSpacer: { height: 220 },
  filtersWrapper: { zIndex: 110, marginBottom: -20 },
  filterPadding: { paddingHorizontal: 24, gap: 10, paddingBottom: 30 },
  chip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, backgroundColor: 'rgba(30, 41, 59, 0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  mainSurface: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 35, borderTopRightRadius: 35, minHeight: height, paddingHorizontal: 20, paddingTop: 30 },
  eventsList: { width: '100%' },
  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 50, fontSize: 16 }
});