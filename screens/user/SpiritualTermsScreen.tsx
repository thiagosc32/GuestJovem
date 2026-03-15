/**
 * Termos de uso espiritual — declaração obrigatória sobre os níveis.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LEVEL_DISCLAIMER_MESSAGE,
  LEVEL_DISCLAIMER_EXPANDED,
  LEVEL_DISCLAIMER_SHORT,
} from '../../constants/spiritualJourney';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/dimensions';
import { TYPOGRAPHY } from '../../constants/theme';

export default function SpiritualTermsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Termos de uso espiritual</Text>
        <Text style={styles.sectionLabel}>Declaração base do sistema</Text>
        <Text style={styles.paragraph}>{LEVEL_DISCLAIMER_MESSAGE}</Text>
        <Text style={styles.sectionLabel}>Sobre os níveis</Text>
        <Text style={styles.paragraph}>{LEVEL_DISCLAIMER_EXPANDED}</Text>
        <Text style={styles.quote}>"{LEVEL_DISCLAIMER_SHORT}"</Text>
        <Text style={styles.footer}>
          Os níveis existem apenas para organizar a jornada de uso na plataforma e
          incentivar constância, de forma saudável, segura e respeitosa.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.LG, paddingBottom: SPACING.XL * 2 },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: SPACING.LG,
  },
  sectionLabel: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
    marginTop: SPACING.LG,
    marginBottom: SPACING.SM,
  },
  paragraph: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    lineHeight: 24,
  },
  quote: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    color: COLORS.secondary,
    fontStyle: 'italic',
    marginTop: SPACING.MD,
    paddingHorizontal: SPACING.MD,
  },
  footer: {
    ...TYPOGRAPHY.caption,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.LG,
    lineHeight: 20,
  },
});
