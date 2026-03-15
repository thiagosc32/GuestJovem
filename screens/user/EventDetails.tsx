import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar, MapPin, Clock, CheckCircle } from 'lucide-react-native';
import { supabase, createEventRSVP } from '../../services/supabase';
import { COLORS } from '../../constants/colors';
import { DEFAULT_EVENT_IMAGE_URL } from '../../constants/images';

export default function EventDetails() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { eventId } = route.params as { eventId: string };
  
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  useFocusEffect(
    React.useCallback(() => {
      if (!eventId) return;
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: rsvps } = await supabase
          .from('event_rsvps')
          .select('event_id')
          .eq('event_id', eventId)
          .eq('user_id', user.id);
        setIsConfirmed(Array.isArray(rsvps) && rsvps.length > 0);
      })();
    }, [eventId])
  );

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      setEvent(data);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: rsvps } = await supabase
          .from('event_rsvps')
          .select('event_id')
          .eq('event_id', eventId)
          .eq('user_id', user.id);
        setIsConfirmed(Array.isArray(rsvps) && rsvps.length > 0);
      }
    } catch (error) {
      console.error('Erro ao carregar evento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPresence = async () => {
    if (event?.requires_registration) {
      if (event?.is_paid) {
        navigation.navigate('EventPaymentScreen', { eventId: event.id });
        return;
      }
      navigation.navigate('RegistrationScreen', { eventId: event.id });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setConfirming(true);
    try {
      await createEventRSVP(eventId, user.id);
      setIsConfirmed(true);
      Alert.alert('Sucesso', 'Sua presença foi confirmada!');
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível confirmar.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* IMAGEM DO EVENTO: padrão quando nenhuma imagem foi adicionada */}
        <Image 
          source={{ uri: event?.image_url?.trim() ? event.image_url : DEFAULT_EVENT_IMAGE_URL }} 
          style={styles.eventImage}
          resizeMode="cover"
        />

        <View style={styles.content}>
          <Text style={styles.title}>{event?.title || 'Título do Evento'}</Text>
          
          <View style={styles.infoRow}>
            <Calendar size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>{event?.date || 'Data não definida'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Clock size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>{event?.time || '19:30'}</Text>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>{event?.location || 'Local a definir'}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Sobre o evento</Text>
          <Text style={styles.description}>
            {event?.description || 'Nenhuma descrição detalhada fornecida para este evento.'}
          </Text>

          {/* BOTÃO DE INSCRIÇÃO OU PRESENÇA */}
          {isConfirmed ? (
            <View style={[styles.button, styles.buttonConfirmed]}>
              <CheckCircle size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Presença confirmada</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[
                styles.button, 
                !event?.requires_registration && { backgroundColor: '#28a745', shadowColor: '#28a745' } 
              ]}
              onPress={handleConfirmPresence}
              disabled={confirming}
            >
              {confirming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {event?.requires_registration 
                    ? (event.is_paid ? `Garantir Ingresso • R$ ${event.price}` : 'Fazer Inscrição Gratuita')
                    : 'Confirmar Presença'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  backButton: { padding: 4 },
  eventImage: { width: '100%', height: 250, backgroundColor: '#f0f0f0' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { marginLeft: 10, fontSize: 16, color: COLORS.textSecondary },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  description: { fontSize: 16, color: COLORS.textSecondary, lineHeight: 24, marginBottom: 30 },
  button: { 
    backgroundColor: COLORS.primary, 
    padding: 18, 
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8
  },
  buttonConfirmed: { backgroundColor: '#28a745', shadowColor: '#28a745' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});