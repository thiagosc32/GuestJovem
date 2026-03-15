/**
 * Conteúdo customizado do Drawer (sidebar).
 * Itens: Jornada, Disciplinas, Comunidade, Pedidos de Oração + separador + Logout com confirmação.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
  DrawerItem,
} from '@react-navigation/drawer';
import { Sparkles, ListChecks, MessageCircle, Heart, LogOut, Shield, PenLine, BookOpen, Award, BookMarked, Lock } from 'lucide-react-native';
import { Alert } from 'react-native';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/dimensions';
import { isFeatureAvailableForLevel, getLockedFeatureAlert, type FeatureId } from '../../constants/featureGates';
import { getJourneySummary } from '../../services/spiritualJourney';
import { supabase } from '../../services/supabase';
import type { UserDrawerParamList } from '../../types/navigation';

const DRAWER_WIDTH = 280;

type DrawerItemConfig = {
  name: keyof UserDrawerParamList | 'JourneyScreen' | 'DisciplinesScreen' | 'SpiritualReflectionsScreen' | 'CommunityWall' | 'PrayerRequestScreen' | 'BibleScreen' | 'BadgesScreen' | 'VerseOfTheDayScreen' | 'GuidedStudiesScreen';
  label: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  /** Se definido, navega para MainTabs com esta aba (mantém menu inferior visível) */
  mainTabScreen?: keyof import('../../types/navigation').UserTabParamList;
  /** Id para liberação por nível (feature gates). Se não informado, item sempre visível. */
  featureId?: FeatureId;
};

const MENU_ITEMS: DrawerItemConfig[] = [
  { name: 'JourneyScreen', label: 'Jornada Espiritual', icon: Sparkles, mainTabScreen: 'JourneyScreen', featureId: 'spiritual_profile' },
  { name: 'DisciplinesScreen', label: 'Disciplinas Espirituais', icon: ListChecks, mainTabScreen: 'DisciplinesScreen', featureId: 'disciplines' },
  { name: 'SpiritualReflectionsScreen', label: 'Reflexões Espirituais', icon: PenLine, mainTabScreen: 'SpiritualReflectionsScreen', featureId: 'reflections' },
  { name: 'BibleScreen', label: 'Bíblia', icon: BookOpen, mainTabScreen: 'BibleScreen', featureId: 'bible' },
  { name: 'VerseOfTheDayScreen', label: 'Versículo do dia', icon: BookMarked, mainTabScreen: 'VerseOfTheDayScreen' },
  { name: 'BadgesScreen', label: 'Conquistas', icon: Award, mainTabScreen: 'BadgesScreen', featureId: 'badges' },
  { name: 'CommunityWall', label: 'Comunidade', icon: MessageCircle, mainTabScreen: 'CommunityWall', featureId: 'community' },
  { name: 'PrayerRequestScreen', label: 'Pedidos de Oração', icon: Heart, mainTabScreen: 'PrayerRequestScreen', featureId: 'prayer' },
  { name: 'GuidedStudiesScreen', label: 'Estudos em grupo', icon: BookMarked, mainTabScreen: 'GuidedStudiesScreen', featureId: 'guided_studies' },
];

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { state, navigation } = props;
  const insets = useSafeAreaInsets();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [journeyLevel, setJourneyLevel] = useState(1);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      const { data: row } = await supabase.from('users').select('role').eq('id', user.id).single();
      setIsAdmin((row as any)?.role === 'admin');
      const summary = await getJourneySummary(user.id);
      setJourneyLevel(summary?.level ?? 1);
    })();
  }, []);

  const handleLogout = () => {
    setLogoutModalVisible(false);
    navigation.closeDrawer();
    supabase.auth.signOut();
  };

  const confirmLogout = () => {
    setLogoutModalVisible(true);
  };

  return (
    <>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + SPACING.XL * 2 }]}
        style={styles.drawer}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Guest Jovem</Text>
        </View>
        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isLocked = item.featureId && !isFeatureAvailableForLevel(item.featureId, journeyLevel);
            const isFocused = !item.mainTabScreen && state.routes[state.index].name === item.name;
            return (
              <DrawerItem
                key={item.name}
                label={item.label}
                onPress={() => {
                  if (isLocked && item.featureId) {
                    const alertContent = getLockedFeatureAlert(item.featureId, journeyLevel);
                    if (alertContent) Alert.alert(alertContent.title, alertContent.message, [{ text: 'Entendi' }]);
                    navigation.closeDrawer();
                  } else if (item.mainTabScreen) {
                    navigation.navigate('MainTabs', { screen: item.mainTabScreen });
                  } else {
                    navigation.navigate(item.name as keyof UserDrawerParamList);
                  }
                }}
                focused={isFocused && !isLocked}
                activeBackgroundColor={COLORS.surfaceVariant}
                activeTintColor={isLocked ? COLORS.textSecondary : COLORS.primary}
                inactiveTintColor={isLocked ? COLORS.textSecondary : COLORS.text}
                labelStyle={[styles.label, isLocked && styles.labelLocked]}
                icon={({ color, size }) => (
                  <View style={styles.iconWrap}>
                    {isLocked ? <Lock color={color} size={size} /> : <Icon color={color} size={size} />}
                  </View>
                )}
              />
            );
          })}
        </View>

        {isAdmin && (
          <>
            <View style={styles.separator} />
            <DrawerItem
              label="Área Admin"
              onPress={() => navigation.navigate('AdminTabs' as any)}
              activeBackgroundColor={COLORS.surfaceVariant}
              activeTintColor={COLORS.primary}
              inactiveTintColor={COLORS.text}
              labelStyle={styles.label}
              icon={({ color, size }) => <Shield color={color} size={size} />}
            />
          </>
        )}

        <View style={styles.separator} />

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={confirmLogout}
          activeOpacity={0.7}
        >
          <LogOut size={22} color={COLORS.error} />
          <Text style={styles.logoutLabel}>Sair da conta</Text>
        </TouchableOpacity>
      </DrawerContentScrollView>

      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLogoutModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Sair da conta?</Text>
            <Text style={styles.modalMessage}>
              Você precisará fazer login novamente para acessar o app.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonLogout} onPress={handleLogout}>
                <Text style={styles.modalButtonLogoutText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  drawer: { flex: 1, width: DRAWER_WIDTH },
  scrollContent: { flexGrow: 1 },
  drawerHeader: {
    paddingHorizontal: SPACING.LG,
    paddingBottom: SPACING.XL,
    marginBottom: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  menuSection: { marginBottom: SPACING.SM },
  label: { fontSize: 15, fontWeight: '500' },
  labelLocked: { color: COLORS.textSecondary },
  iconWrap: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.MD,
    marginHorizontal: SPACING.LG,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    gap: 12,
  },
  logoutLabel: { fontSize: 15, fontWeight: '500', color: COLORS.error },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  modalMessage: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 20 },
  modalButtons: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  modalButtonCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalButtonCancelText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
  modalButtonLogout: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.error,
    borderRadius: 8,
  },
  modalButtonLogoutText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
