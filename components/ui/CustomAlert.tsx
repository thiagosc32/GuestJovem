import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function CustomAlert({ 
  visible, 
  title, 
  message, 
  type = 'info',
  onConfirm, 
  onCancel, 
  confirmText = 'OK', 
  cancelText = 'Cancel' 
}: CustomAlertProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={64} color={COLORS.success} />;
      case 'error':
        return <AlertCircle size={64} color={COLORS.error} />;
      case 'warning':
        return <AlertTriangle size={64} color={COLORS.warning} />;
      case 'info':
      default:
        return <Info size={64} color={COLORS.info} />;
    }
  };

  const getConfirmButtonColor = () => {
    switch (type) {
      case 'success':
        return COLORS.success;
      case 'error':
        return COLORS.error;
      case 'warning':
        return COLORS.warning;
      case 'info':
      default:
        return COLORS.primary;
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {getIcon()}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            {onCancel && (
              <TouchableOpacity onPress={onCancel} style={styles.button}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              onPress={onConfirm} 
              style={[styles.button, styles.confirmButton, { backgroundColor: getConfirmButtonColor() }]}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
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
    alignItems: 'center' 
  },
  container: { 
    backgroundColor: '#fff', 
    borderRadius: BORDER_RADIUS.LG, 
    padding: SPACING.XL, 
    width: '85%', 
    maxWidth: 400,
    alignItems: 'center',
    ...SHADOWS.large,
  },
  title: { 
    ...TYPOGRAPHY.h2, 
    marginTop: SPACING.MD, 
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  message: { 
    ...TYPOGRAPHY.body, 
    color: COLORS.textSecondary, 
    marginBottom: SPACING.LG,
    textAlign: 'center',
  },
  buttons: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: SPACING.MD,
    width: '100%',
  },
  button: { 
    paddingVertical: SPACING.MD, 
    paddingHorizontal: SPACING.LG,
    borderRadius: BORDER_RADIUS.MD,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmButton: { 
    backgroundColor: COLORS.primary, 
  },
  cancelText: { 
    color: COLORS.primary, 
    fontSize: 16,
    fontWeight: '600',
  },
  confirmText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
});