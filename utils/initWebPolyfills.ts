/**
 * Na web, Alert.alert do React Native muitas vezes não exibe diálogos nem executa onPress,
 * o que quebra confirmações de exclusão e outros fluxos. Usamos APIs do navegador.
 */
import { Alert, Platform, type AlertButton } from 'react-native';

function webAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (typeof window === 'undefined') return;
  const text = [title, message].filter(Boolean).join('\n\n');

  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }

  if (buttons.length === 1) {
    window.alert(text);
    queueMicrotask(() => buttons[0].onPress?.());
    return;
  }

  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const confirmed = window.confirm(text);

  if (confirmed) {
    const destructive = buttons.find((b) => b.style === 'destructive');
    const primary =
      destructive ??
      [...buttons].reverse().find((b) => b.style !== 'cancel') ??
      buttons[buttons.length - 1];
    if (primary && primary !== cancelBtn) {
      queueMicrotask(() => primary.onPress?.());
    }
  } else {
    queueMicrotask(() => cancelBtn?.onPress?.());
  }
}

if (Platform.OS === 'web') {
  Alert.alert = webAlert;
}
