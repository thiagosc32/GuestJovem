/**
 * Lista de pessoas que concluíram ao menos um devocional (esta semana).
 * Acessada pelo card "Conclusão de Devocionais" na seção Engajamento do Admin.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, BookOpen } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { getDevotionalCompletionsUsers } from '../../services/supabase';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { Image } from 'expo-image';

export default function AdminDevotionalCompletionsScreen() {
  const navigation = useNavigation();
  const [users, setUsers] = useState<{ id: string; name: string; avatar_url: string | null; completions_count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await getDevotionalCompletionsUsers();
        setUsers(list);
      } catch (_) {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conclusão de devocionais</Text>
        <View style={styles.backBtn} />
      </View>
      <Text style={styles.subtitle}>Pessoas que fizeram ao menos 1 devocional nos últimos 30 dias</Text>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {users.length === 0 ? (
            <View style={styles.empty}>
              <BookOpen size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Nenhuma conclusão no período.</Text>
            </View>
          ) : (
            users.map((u) => (
              <View key={u.id} style={styles.card}>
                {u.avatar_url ? (
                  <Image source={{ uri: u.avatar_url }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <User size={24} color={COLORS.primary} />
                  </View>
                )}
                <View style={styles.cardRight}>
                  <Text style={styles.name}>{u.name}</Text>
                  <Text style={styles.count}>{u.completions_count} {u.completions_count === 1 ? 'devocional' : 'devocionais'} concluído{u.completions_count === 1 ? '' : 's'}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.LG, paddingVertical: SPACING.MD, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 40, alignItems: 'center' },
  headerTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  subtitle: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, paddingHorizontal: SPACING.LG, paddingTop: SPACING.SM, paddingBottom: SPACING.MD },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: SPACING.LG, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.LG, padding: SPACING.MD, marginBottom: SPACING.SM, ...SHADOWS.small },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${COLORS.primary}18`, justifyContent: 'center', alignItems: 'center' },
  cardRight: { marginLeft: 12, flex: 1 },
  name: { ...TYPOGRAPHY.body, fontWeight: '600', color: COLORS.text },
  count: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 2 },
});
