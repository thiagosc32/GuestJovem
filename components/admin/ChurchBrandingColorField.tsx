import React, { createElement, type ChangeEvent } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY } from '../../constants/theme';

/** Paleta comum + tons neutros (hex em maiúsculas para consistência). */
const PRESET_COLORS = [
  '#D32F2F',
  '#C62828',
  '#E91E63',
  '#9C27B0',
  '#673AB7',
  '#3F51B5',
  '#1976D2',
  '#0288D1',
  '#0097A7',
  '#00796B',
  '#388E3C',
  '#689F38',
  '#F57C00',
  '#FF6F00',
  '#F9A825',
  '#5D4037',
  '#455A64',
  '#37474F',
  '#263238',
  '#000000',
  '#616161',
  '#9E9E9E',
  '#E0E0E0',
  '#FFFFFF',
];

export function normalizeHex6(value: string): string | null {
  const t = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

type Props = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  placeholder: string;
};

export function ChurchBrandingColorField({ label, value, onChange, placeholder }: Props) {
  const safePickerValue = normalizeHex6(value) ?? '#888888';
  const selectedUpper = value.trim().toUpperCase();

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.swatches}>
        {PRESET_COLORS.map((c) => {
          const selected = selectedUpper === c;
          return (
            <TouchableOpacity
              key={c}
              accessibilityLabel={`Cor ${c}`}
              style={[
                styles.swatch,
                { backgroundColor: c },
                c === '#FFFFFF' && styles.swatchWhite,
                selected && styles.swatchSelected,
              ]}
              onPress={() => onChange(c)}
            />
          );
        })}
      </View>
      {Platform.OS === 'web' ? (
        <View style={styles.webPickerWrap}>
          <Text style={styles.pickerHint}>Seletor do navegador</Text>
          {createElement('input', {
            type: 'color',
            value: safePickerValue,
            onChange: (e: ChangeEvent<HTMLInputElement>) => {
              const v = e.target?.value;
              if (v) onChange(v.toUpperCase());
            },
            style: {
              width: '100%',
              height: 44,
              border: 'none',
              borderRadius: BORDER_RADIUS.MD,
              cursor: 'pointer',
              padding: 0,
              backgroundColor: 'transparent',
            },
          })}
        </View>
      ) : null}
      <Text style={styles.hexHint}>Ou digite o código hex:</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        autoCapitalize="characters"
        autoCorrect={false}
      />
    </View>
  );
}

const SWATCH = 34;

const styles = StyleSheet.create({
  block: { marginBottom: SPACING.MD },
  label: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.SM },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.SM,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: BORDER_RADIUS.SM,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  swatchWhite: {
    borderColor: COLORS.textSecondary,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  webPickerWrap: {
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
    padding: 4,
    backgroundColor: COLORS.surface,
  },
  pickerHint: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 4 },
  hexHint: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    padding: 12,
    color: COLORS.text,
  },
});
