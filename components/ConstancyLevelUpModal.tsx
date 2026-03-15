/**
 * Modal exibido quando o usuário sobe de nível de constância (ovelinha).
 * Estilo similar ao OnboardingLevelModal: janela centralizada, não no card.
 */

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS } from '../constants/dimensions';
import { TYPOGRAPHY } from '../constants/theme';
import type { ConstancyLevelUpContent } from '../constants/spiritualCompanion';

const VARIANT_COLORS = {
  green: COLORS.success,
  yellow: COLORS.warning,
  orange: COLORS.spiritualOrange,
  red: COLORS.primary,
} as const;

export interface ConstancyLevelUpModalProps {
  visible: boolean;
  content: ConstancyLevelUpContent | null;
  onDismiss: () => void;
}

export default function ConstancyLevelUpModal({ visible, content, onDismiss }: ConstancyLevelUpModalProps) {
  if (!content) return null;

  const accentColor = VARIANT_COLORS[content.variant];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.indicator, { backgroundColor: accentColor }]} />
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.message}>"{content.message}"</Text>
          <Text style={styles.secondary}>{content.secondaryMessage}</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: accentColor }]} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Entendi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginHorizontal: SPACING.LG,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    maxWidth: 400,
  },
  indicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.MD,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  secondary: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.MD,
    lineHeight: 20,
  },
  button: {
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.MD,
    marginTop: SPACING.LG,
  },
  buttonText: {
    ...TYPOGRAPHY.button,
    color: '#fff',
    textAlign: 'center',
  },
});
