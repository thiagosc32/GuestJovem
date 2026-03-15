/**
 * Modal exibido na primeira vez que o usuário acessa o app (após login).
 * Mostra a declaração obrigatória sobre os níveis.
 */

import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS } from '../constants/dimensions';
import { TYPOGRAPHY } from '../constants/theme';
import {
  LEVEL_DISCLAIMER_MESSAGE,
  LEVEL_DISCLAIMER_EXPANDED,
} from '../constants/spiritualJourney';

const STORAGE_KEY = 'onboarding_level_seen';

export default function OnboardingLevelModal() {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEY);
        setVisible(seen !== 'true');
      } catch (_) {
        setVisible(true);
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch (_) {}
    setVisible(false);
  };

  if (!checked || !visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Sobre os níveis</Text>
          <Text style={styles.message}>{LEVEL_DISCLAIMER_MESSAGE}</Text>
          <Text style={styles.expanded}>{LEVEL_DISCLAIMER_EXPANDED}</Text>
          <TouchableOpacity style={styles.button} onPress={handleDismiss} activeOpacity={0.85}>
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
  },
  expanded: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: SPACING.MD,
    lineHeight: 20,
  },
  button: {
    backgroundColor: COLORS.primary,
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
