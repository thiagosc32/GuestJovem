/**
 * Mensagem fixa que contextualiza os níveis: não medem fé, santidade ou valor espiritual.
 * Exibida de forma sutil e respeitosa onde a etapa/jornada é mostrada.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/dimensions';
import { TYPOGRAPHY } from '../constants/theme';
import { LEVEL_DISCLAIMER_MESSAGE, GROWTH_PHRASE, GROWTH_PHRASE_REF } from '../constants/spiritualJourney';

export default function LevelDisclaimer() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.disclaimerText}>{LEVEL_DISCLAIMER_MESSAGE}</Text>
      <Text style={styles.growthPhrase}>"{GROWTH_PHRASE}" — {GROWTH_PHRASE_REF}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    marginBottom: SPACING.MD,
  },
  disclaimerText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
  growthPhrase: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: SPACING.XS,
  },
});
