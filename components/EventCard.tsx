import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle, 
  Star, 
  Flame, 
  Coffee, 
  Moon, 
  ArrowRight,
  ClipboardCheck // Ícone sugerido para inscrição
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient'; 
import { COLORS } from '../constants/colors';
import { SHADOWS } from '../constants/theme';

interface EventCardProps {
  event: any;
  isConfirmed?: boolean;
  onConfirm?: (eventId: string) => void;
}

export default function EventCard({ event, isConfirmed = false, onConfirm }: EventCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  const tipoReal = event.event_type || event.category;

  const getTheme = (tipo: string) => {
    const t = tipo?.toLowerCase().trim();
    if (t === 'confraternização' || t === 'fellowship') 
      return { color: ['#F59E0B', '#D97706'], label: 'Confraternização', icon: <Coffee size={14} color="#fff" /> };
    if (t === 'oração' || t === 'prayer') 
      return { color: ['#3B82F6', '#2563EB'], label: 'Oração', icon: <Flame size={14} color="#fff" /> };
    if (t === 'vigília' || t === 'vigil') 
      return { color: ['#1E293B', '#0F172A'], label: 'Vigília', icon: <Moon size={14} color="#fff" /> };
    if (t === 'culto' || t === 'service') 
      return { color: [COLORS.primary, '#4F46E5'], label: 'Culto', icon: <Star size={14} color="#fff" /> };
    
    return { color: ['#64748B', '#475569'], label: tipo || 'Evento', icon: <Calendar size={14} color="#fff" /> };
  };

  const theme = getTheme(tipoReal);

  return (
    <View style={styles.card}>
      {/* HEADER DO CARD */}
      <View style={styles.header}>
        <LinearGradient
          colors={theme.color}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.categoryBadge}
        >
          {theme.icon}
          <Text style={styles.categoryText}>{theme.label}</Text>
        </LinearGradient>

        <View style={styles.attendeeBadge}>
          <Users size={12} color="#64748B" />
          <Text style={styles.attendeeText}>Público</Text>
        </View>
      </View>

      {/* CORPO DO CARD */}
      <View style={styles.body}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <View style={styles.locationRow}>
          <MapPin size={14} color="#64748B" />
          <Text style={styles.locationText}>{event.location || 'Templo Sede'}</Text>
        </View>
      </View>

      {/* BARRA DE INFORMAÇÕES (DATA/HORA) */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Calendar size={16} color={COLORS.primary} />
          <Text style={styles.infoValue}>
            {event.date ? new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR') : '--/--/--'}
          </Text>
        </View>
        <View style={styles.verticalDivider} />
        <View style={styles.infoItem}>
          <Clock size={16} color={COLORS.primary} />
          <Text style={styles.infoValue}>{event.time || '19:30'}</Text>
        </View>
      </View>

      {/* BOTÃO DE AÇÃO DINÂMICO (CORRIGIDO) */}
      <TouchableOpacity 
        activeOpacity={0.8}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        onPress={() => onConfirm && onConfirm(event.id)}
        style={[
          styles.actionButton,
          // Se confirmado, fica verde. Se exige inscrição, usa cor primária. Se for presença livre, usamos um tom diferente (ex: verde ou azul claro)
          isConfirmed ? styles.confirmedButton : (event.requires_registration ? styles.registerButton : styles.confirmButton),
          isPressed && { transform: [{ scale: 0.98 }] }
        ]}
      >
        {isConfirmed ? (
          <>
            <CheckCircle size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.actionButtonText}>Presença Confirmada</Text>
          </>
        ) : (
          <>
            {/* Ícone muda se for inscrição ou presença */}
            {event.requires_registration ? (
              <ClipboardCheck size={20} color="#fff" style={styles.buttonIcon} />
            ) : (
              <ArrowRight size={20} color="#fff" style={styles.buttonIcon} />
            )}
            
            <Text style={styles.actionButtonText}>
              {event.requires_registration ? "Fazer Inscrição" : "Confirmar Presença"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attendeeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  attendeeText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  body: { marginBottom: 16 },
  eventTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  infoItem: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#334155' },
  verticalDivider: { width: 1, height: 15, backgroundColor: '#CBD5E1' },
  
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  confirmButton: {
    backgroundColor: '#6366F1', // Indigo para Presença Livre
  },
  registerButton: {
    backgroundColor: COLORS.primary, // Cor principal para Inscrição
  },
  confirmedButton: {
    backgroundColor: '#10B981', // Verde Sucesso
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonIcon: {
    marginRight: 8,
  }
});