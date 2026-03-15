import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
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
  ClipboardCheck,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Gradient from './ui/Gradient';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS } from '../constants/dimensions';
import { SHADOWS } from '../constants/theme';
import { DEFAULT_EVENT_IMAGE_URL } from '../constants/images';

interface EventCardProps {
  event: any;
  isConfirmed?: boolean;
  onConfirm?: (eventId: string) => void;
}

function getTheme(tipo: string) {
  const t = tipo?.toLowerCase().trim();
  if (t === 'confraternização' || t === 'fellowship')
    return { color: [COLORS.secondary, COLORS.secondaryDark], label: 'Confraternização', icon: <Coffee size={14} color="#fff" /> };
  if (t === 'oração' || t === 'prayer')
    return { color: ['#3B82F6', '#2563EB'], label: 'Oração', icon: <Flame size={14} color="#fff" /> };
  if (t === 'vigília' || t === 'vigil')
    return { color: ['#1E293B', '#0F172A'], label: 'Vigília', icon: <Moon size={14} color="#fff" /> };
  if (t === 'culto' || t === 'service')
    return { color: [COLORS.primary, COLORS.primaryDark], label: 'Culto', icon: <Star size={14} color="#fff" /> };
  return { color: [COLORS.textSecondary, '#475569'], label: tipo || 'Evento', icon: <Calendar size={14} color="#fff" /> };
}

export default function EventCard({ event, isConfirmed = false, onConfirm }: EventCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const tipoReal = event.event_type || event.category;
  const theme = getTheme(tipoReal);
  const imageUri = event.image_url || DEFAULT_EVENT_IMAGE_URL;

  return (
    <View style={styles.card}>
      {/* Imagem de capa com overlay */}
      <View style={styles.imageWrap}>
        <Image source={{ uri: imageUri }} style={styles.coverImage} resizeMode="cover" />
        <Gradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
          style={styles.coverOverlay}
        />
        <View style={styles.badgesRow}>
          <LinearGradient
            colors={[theme.color[0], theme.color[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.categoryBadge}
          >
            {theme.icon}
            <Text style={styles.categoryText}>{theme.label}</Text>
          </LinearGradient>
          <View style={styles.attendeeBadge}>
            <Users size={12} color={COLORS.textSecondary} />
            <Text style={styles.attendeeText}>Público</Text>
          </View>
        </View>
        <View style={styles.coverBottom}>
          <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.locationText} numberOfLines={1}>{event.location || 'Templo Sede'}</Text>
          </View>
        </View>
      </View>

      {/* Data e hora */}
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

      {/* Botão de ação */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        onPress={() => onConfirm?.(event.id)}
        style={[
          styles.actionButton,
          isConfirmed ? styles.confirmedButton : (event.requires_registration ? styles.registerButton : styles.confirmButton),
          isPressed && styles.actionButtonPressed,
        ]}
      >
        {isConfirmed ? (
          <>
            <CheckCircle size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.actionButtonText}>Presença Confirmada</Text>
          </>
        ) : (
          <>
            {event.requires_registration ? (
              <ClipboardCheck size={20} color="#fff" style={styles.buttonIcon} />
            ) : (
              <ArrowRight size={20} color="#fff" style={styles.buttonIcon} />
            )}
            <Text style={styles.actionButtonText}>
              {event.requires_registration ? 'Fazer Inscrição' : 'Confirmar Presença'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.XL + 4,
    overflow: 'hidden',
    marginBottom: SPACING.LG,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageWrap: {
    height: 160,
    position: 'relative',
    backgroundColor: COLORS.background,
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  badgesRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.MD,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.LG,
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  attendeeText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  coverBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING.MD,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginHorizontal: SPACING.MD,
    marginTop: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  infoItem: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  infoValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  verticalDivider: { width: 1, height: 16, backgroundColor: COLORS.border },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    ...SHADOWS.small,
  },
  actionButtonPressed: { opacity: 0.92 },
  confirmButton: { backgroundColor: COLORS.primary },
  registerButton: { backgroundColor: COLORS.primary },
  confirmedButton: { backgroundColor: COLORS.success },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  buttonIcon: { marginRight: 8 },
});
