/**
 * Versículo do dia — prática recomendada para Ouvir (novo na fé).
 * Exibe o versículo definido pelo admin em app_settings (verse_of_the_day) ou lista padrão.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BookOpen, ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Gradient from '../../components/ui/Gradient';
import { getAppSetting } from '../../services/supabase';

/** Versículos rotativos por dia (índice = dia do ano % tamanho) */
const DAILY_VERSES: { ref: string; text: string }[] = [
  { ref: 'João 15:5', text: 'Eu sou a videira, vocês são os ramos. Quem permanece em mim, e eu nele, esse dá muito fruto.' },
  { ref: 'João 3:16', text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.' },
  { ref: 'Filipenses 4:13', text: 'Tudo posso naquele que me fortalece.' },
  { ref: 'Jeremias 29:11', text: 'Porque eu sei os planos que tenho para vocês, diz o Senhor, planos de paz e não de mal, para dar-lhes o fim que desejam.' },
  { ref: 'Romanos 8:28', text: 'Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus.' },
  { ref: 'Salmo 23:1', text: 'O Senhor é o meu pastor; nada me faltará.' },
  { ref: 'Isaías 41:10', text: 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.' },
  { ref: 'Mateus 11:28', text: 'Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.' },
  { ref: 'Provérbios 3:5-6', text: 'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento. Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas.' },
  { ref: '2 Coríntios 5:17', text: 'Se alguém está em Cristo, nova criatura é; as coisas antigas já passaram; eis que tudo se fez novo.' },
];

const VERSE_OF_THE_DAY_KEY = 'verse_of_the_day';

function getDefaultVerseOfTheDay(): { ref: string; text: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % DAILY_VERSES.length;
  return DAILY_VERSES[index];
}

export default function VerseOfTheDayScreen() {
  const navigation = useNavigation<any>();
  const [verse, setVerse] = useState<{ ref: string; text: string }>(getDefaultVerseOfTheDay);
  const [loading, setLoading] = useState(true);

  const loadVerse = useCallback(async () => {
    try {
      const raw = await getAppSetting(VERSE_OF_THE_DAY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { ref?: string; text?: string };
        if (parsed.ref && parsed.text) {
          setVerse({ ref: parsed.ref, text: parsed.text });
        }
      }
    } catch (_) {}
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVerse();
    }, [loadVerse])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Gradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.getParent()?.navigate?.('MainTabs', { screen: 'UserDashboard' })}
          activeOpacity={0.8}
        >
          <ArrowLeft size={24} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.title}>Versículo do dia</Text>
        <Text style={styles.subtitle}>Um versículo para meditar hoje. Indicado especialmente para quem está começando.</Text>
      </Gradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <>
            <View style={styles.verseCard}>
              <BookOpen size={48} color={COLORS.primary} strokeWidth={1.5} style={styles.verseIcon} />
              <Text style={styles.verseRef}>{verse.ref}</Text>
              <Text style={styles.verseText}>"{verse.text}"</Text>
            </View>
            <Text style={styles.hint}>Medite neste versículo ao longo do dia. Crescer não é competir, é permanecer.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: SPACING.LG, paddingBottom: SPACING.XL, paddingHorizontal: SPACING.LG },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  title: { ...TYPOGRAPHY.h1, color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 22 },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  verseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.XL,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  verseIcon: { marginBottom: SPACING.MD },
  verseRef: { ...TYPOGRAPHY.h3, color: COLORS.primary, marginBottom: SPACING.MD },
  verseText: {
    ...TYPOGRAPHY.body,
    fontSize: 18,
    lineHeight: 28,
    color: COLORS.text,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  hint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.LG,
  },
  loadingWrap: { paddingVertical: 48, alignItems: 'center' },
});
