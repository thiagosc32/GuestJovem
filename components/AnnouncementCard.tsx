import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { Megaphone, ArrowRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS } from '../constants/dimensions';
import { SHADOWS } from '../constants/theme';
import { RootStackParamList } from '../types/navigation';

interface AnnouncementCardProps {
  announcement: any;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const isHigh = announcement.priority === 'high';

  const handlePressAction = () => {
    const drawer = navigation.getParent() as { navigate: (name: string, params?: object) => void } | undefined;
    if (drawer?.navigate) {
      switch (announcement.action_type) {
        case 'event': drawer.navigate('MainTabs', { screen: 'EventsScreen' }); break;
        case 'devotional': drawer.navigate('MainTabs', { screen: 'DevotionalScreen' }); break;
        case 'prayer': drawer.navigate('MainTabs', { screen: 'PrayerRequestScreen' }); break;
      }
    } else {
      switch (announcement.action_type) {
        case 'event': (navigation as any).navigate('UserTabs', { screen: 'EventsScreen' }); break;
        case 'devotional': (navigation as any).navigate('UserTabs', { screen: 'DevotionalScreen' }); break;
        case 'prayer': (navigation as any).navigate('UserTabs', { screen: 'PrayerRequestScreen' }); break;
      }
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

  const gradientColors = isHigh
    ? ['rgba(211,47,47,0.75)', 'rgba(154,0,7,0.95)'] as const
    : ['rgba(45,45,45,0.7)', 'rgba(20,20,20,0.95)'] as const;

  return (
    <TouchableOpacity activeOpacity={0.95} style={styles.wrapper}>
      <View style={[styles.container, isHigh && styles.containerHigh]}>
        {/* Barra lateral de destaque */}
        <View style={[styles.accentBar, isHigh ? styles.accentBarHigh : styles.accentBarNormal]} />

        <ImageBackground
          source={{
            uri: isHigh
              ? 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=600'
              : 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600',
          }}
          style={styles.imageBg}
          imageStyle={styles.imageStyle}
        >
          <LinearGradient colors={gradientColors} style={styles.gradient}>
            <View style={styles.content}>
              <View style={styles.tagRow}>
                <View style={[styles.tagPill, isHigh ? styles.tagPillHigh : styles.tagPillNormal]}>
                  <Megaphone size={12} color="#fff" />
                  <Text style={styles.tagText}>{isHigh ? 'URGENTE' : 'AVISO'}</Text>
                </View>
              </View>
              <Text style={styles.title} numberOfLines={2}>{announcement.title}</Text>
              <Text style={styles.message} numberOfLines={2}>{announcement.message}</Text>

              {buttonLabel && (
                <TouchableOpacity
                  style={[styles.actionButton, isHigh ? styles.actionButtonHigh : styles.actionButtonNormal]}
                  onPress={handlePressAction}
                  activeOpacity={0.85}
                >
                  <Text style={styles.actionButtonText}>{buttonLabel}</Text>
                  <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.LG,
  },
  container: {
    height: 200,
    borderRadius: BORDER_RADIUS.XL + 4,
    overflow: 'hidden',
    flexDirection: 'row',
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  containerHigh: {
    borderColor: COLORS.primary + '40',
    borderWidth: 1.5,
  },
  accentBar: {
    width: 6,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 2,
    borderTopLeftRadius: BORDER_RADIUS.XL + 4,
    borderBottomLeftRadius: BORDER_RADIUS.XL + 4,
  },
  accentBarHigh: {
    backgroundColor: COLORS.accent,
  },
  accentBarNormal: {
    backgroundColor: COLORS.primary,
  },
  imageBg: {
    flex: 1,
    marginLeft: 6,
  },
  imageStyle: {
    borderTopRightRadius: BORDER_RADIUS.XL + 4,
    borderBottomRightRadius: BORDER_RADIUS.XL + 4,
  },
  gradient: {
    flex: 1,
    padding: SPACING.LG,
    paddingLeft: SPACING.LG + 4,
    justifyContent: 'flex-end',
    borderTopRightRadius: BORDER_RADIUS.XL + 4,
    borderBottomRightRadius: BORDER_RADIUS.XL + 4,
  },
  content: {
    width: '100%',
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: SPACING.SM,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  tagPillHigh: {
    backgroundColor: 'rgba(255,215,0,0.35)',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  tagPillNormal: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  tagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 20,
    marginBottom: SPACING.MD,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.LG,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.LG,
    gap: 8,
  },
  actionButtonHigh: {
    backgroundColor: COLORS.accent,
    ...SHADOWS.small,
  },
  actionButtonNormal: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.small,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});
