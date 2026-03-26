/**
 * Seletor de data e hora para web (PWA / navegador).
 * Usa <input type="date"> e <input type="time"> nativos para funcionar
 * em Android Chrome, Safari iOS e desktop.
 * Só deve ser renderizado quando Platform.OS === 'web'.
 */

import React, { createElement } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../constants/colors';

const isWeb = Platform.OS === 'web';

function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimeForInput(timeStr: string): string {
  const [h = 19, m = 30] = timeStr.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const webInputStyle: Record<string, unknown> = {
  padding: 14,
  fontSize: 16,
  width: '100%',
  maxWidth: '100%',
  marginTop: 8,
  marginBottom: 8,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#eee',
  backgroundColor: '#f9f9f9',
  color: '#212121',
  boxSizing: 'border-box',
  display: 'block',
  alignSelf: 'stretch',
};

export type WebDatePickerModalProps = {
  visible: boolean;
  value: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
  title?: string;
};

export function WebDatePickerModal({
  visible,
  value,
  onSelect,
  onClose,
  minimumDate,
  title = 'Selecione a data',
}: WebDatePickerModalProps) {
  if (!isWeb) return null;
  const valueStr = formatDateForInput(value);
  const minStr = minimumDate ? formatDateForInput(minimumDate) : undefined;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {createElement('input', {
            type: 'date',
            value: valueStr,
            min: minStr,
            onChange: (e: { target: { value: string } }) => {
              const v = e.target.value;
              if (v) onSelect(new Date(v + 'T12:00:00'));
            },
            style: webInputStyle,
          })}
          <TouchableOpacity style={styles.confirmBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.confirmBtnText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export type WebTimePickerModalProps = {
  visible: boolean;
  value: string;
  onSelect: (time: string) => void;
  onClose: () => void;
  title?: string;
};

export function WebTimePickerModal({
  visible,
  value,
  onSelect,
  onClose,
  title = 'Selecione a hora',
}: WebTimePickerModalProps) {
  if (!isWeb) return null;
  const valueStr = formatTimeForInput(value);
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {createElement('input', {
            type: 'time',
            value: valueStr,
            onChange: (e: { target: { value: string } }) => {
              const v = e.target.value;
              if (v) onSelect(v);
            },
            style: webInputStyle,
          })}
          <TouchableOpacity style={styles.confirmBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.confirmBtnText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Para uso dentro de um modal já aberto (ex.: agenda do ministério).
 * Renderiza só o input de data, sem modal próprio.
 */
export type WebDateInputInlineProps = {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
};

export function WebDateInputInline({ value, onChange, minimumDate }: WebDateInputInlineProps) {
  if (!isWeb) return null;
  const valueStr = formatDateForInput(value);
  const minStr = minimumDate ? formatDateForInput(minimumDate) : undefined;
  return createElement('input', {
    type: 'date',
    value: valueStr,
    min: minStr,
    onChange: (e: { target: { value: string } }) => {
      const v = e.target.value;
      if (v) onChange(new Date(v + 'T12:00:00'));
    },
    style: webInputStyle,
  });
}

const webOverlayExtra = isWeb
  ? ({
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 100000,
    } as const)
  : {};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    ...webOverlayExtra,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    minWidth: 280,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'stretch',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
