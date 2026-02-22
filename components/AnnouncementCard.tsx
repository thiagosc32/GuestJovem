import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { Megaphone, AlertTriangle, ArrowRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { RootStackParamList } from '../types/navigation';

// Adicione 'action_type' ao seu tipo Announcement se ainda não tiver
interface AnnouncementCardProps {
  announcement: any; // Substitua pelo seu tipo Announcement
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const isHigh = announcement.priority === 'high';

  // Lógica para definir o destino do botão
  const handlePressAction = () => {
    switch (announcement.action_type) {
      case 'event':
        navigation.navigate('UserTabs', { screen: 'EventsScreen' });
        break;
      case 'devotional':
        navigation.navigate('UserTabs', { screen: 'DevotionalScreen' });
        break;
      case 'prayer':
        navigation.navigate('PrayerRequestScreen');
        break;
    }
  };

  const getActionButtonLabel = () => {
    switch (announcement.action_type) {
      case 'event': return 'Ver Evento';
      case 'devotional': return 'Ler Devocional';
      case 'prayer': return 'Pedir Oração';
      default: return null;
    }
  };

  const buttonLabel = getActionButtonLabel();

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={{ uri: isHigh ? 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=500' : 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=500' }} 
        style={styles.imageBg}
        imageStyle={{ borderRadius: 16 }}
      >
        <LinearGradient
          colors={isHigh ? ['rgba(180,0,0,0.7)', 'rgba(20,0,0,0.9)'] : ['rgba(40,40,40,0.6)', 'rgba(0,0,0,0.85)']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <Text style={styles.announcementTag}>{isHigh ? 'URGENTE' : 'AVISO'}</Text>
            <Text style={styles.title}>{announcement.title}</Text>
            <Text style={styles.message} numberOfLines={2}>{announcement.message}</Text>

            {/* BOTÃO DE AÇÃO DINÂMICO */}
            {buttonLabel && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: isHigh ? '#fff' : COLORS.primary }]} 
                onPress={handlePressAction}
              >
                <Text style={[styles.actionButtonText, { color: isHigh ? COLORS.error : '#fff' }]}>
                  {buttonLabel}
                </Text>
                <ArrowRight size={16} color={isHigh ? COLORS.error : '#fff'} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 180, marginBottom: 16, borderRadius: 16, elevation: 5 },
  imageBg: { flex: 1 },
  gradient: { flex: 1, padding: 20, borderRadius: 16, justifyContent: 'center' },
  content: { width: '100%' },
  announcementTag: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  message: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: 12 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: { fontWeight: '700', fontSize: 14 },
});