import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar, Modal, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, globalStyles } from '../../constants/theme';
import { parseUserQRPayload } from '../../constants/userQR';
import { supabase, createAttendanceRecord, getEventForCurrentTime } from '../../services/supabase';

export default function QRCodeScanner() {
  const navigation = useNavigation();
  const route = useRoute();
  const eventId = (route.params as { eventId?: string })?.eventId ?? null;
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; name?: string; message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualBusy, setManualBusy] = useState(false);
  /** Na web: mostrar campo alternativo à câmera (rede, permissão negada, etc.) */
  const [showWebManual, setShowWebManual] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    const userId = parseUserQRPayload(data);

    if (!userId) {
      setScanResult({ success: false, message: 'QR Code inválido. Use o QR do perfil do jovem.' });
      setShowModal(true);
      return;
    }

    try {
      const { data: userRow, error: userError } = await supabase.from('users').select('id, name').eq('id', userId).maybeSingle();
      if (userError || !userRow) {
        setScanResult({ success: false, message: 'Usuário não encontrado no sistema.' });
        setShowModal(true);
        return;
      }

      let resolvedEventId: string | null = eventId || null;
      let eventTitle: string | null = null;
      if (!resolvedEventId) {
        const eventForNow = await getEventForCurrentTime();
        if (eventForNow) {
          resolvedEventId = eventForNow.id;
          eventTitle = eventForNow.title;
        }
      }

      await createAttendanceRecord({
        user_id: userId,
        event_id: resolvedEventId,
        method: 'qr',
        notes: null,
      });

      const eventSuffix = eventTitle ? ` no evento "${eventTitle}"` : '';
      setScanResult({
        success: true,
        name: userRow.name ?? 'Jovem',
        message: `${userRow.name ?? 'Jovem'} — presença registrada${eventSuffix}!`,
      });
    } catch (e: any) {
      setScanResult({ success: false, message: e.message ?? 'Erro ao registrar presença.' });
    }
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setScanResult(null);
    setScanned(false);
  };

  const submitManualWeb = async () => {
    const t = manualCode.trim();
    if (!t) {
      setScanResult({ success: false, message: 'Cole o texto do QR (ex.: FY:USER:...) ou o ID UUID do jovem.' });
      setShowModal(true);
      return;
    }
    setScanned(false);
    setManualBusy(true);
    try {
      await handleBarCodeScanned({ type: 'qr', data: t });
    } finally {
      setManualBusy(false);
      setManualCode('');
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={TYPOGRAPHY.body}>Solicitando permissão da câmera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Leitor de QR Code</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.permissionMessage}>
            <XCircle size={64} color={COLORS.error} />
            <Text style={styles.permissionText}>Permissão de câmera negada</Text>
            <Text style={styles.permissionSubtext}>
              {Platform.OS === 'web'
                ? 'Permita o acesso à câmera no navegador (ícone na barra de endereço) ou use HTTPS. Também pode colar o código abaixo.'
                : 'Habilite o acesso à câmera nas configurações para escanear códigos QR.'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={requestCameraPermission}>
              <Text style={styles.retryButtonText}>Solicitar permissão</Text>
            </TouchableOpacity>
            {Platform.OS === 'web' && (
              <>
                <Text style={[styles.webDividerLabel, { marginTop: SPACING.XL }]}>Entrada manual</Text>
                <TextInput
                  style={[styles.webManualInput, { marginTop: SPACING.SM }]}
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder="FY:USER:... ou UUID"
                  placeholderTextColor={COLORS.textLight}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!manualBusy}
                />
                <TouchableOpacity style={styles.webManualBtn} onPress={submitManualWeb} disabled={manualBusy} activeOpacity={0.85}>
                  {manualBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.webManualBtnText}>Registrar presença</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        <Modal visible={showModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              {scanResult?.success ? <CheckCircle size={64} color={COLORS.success} /> : <XCircle size={64} color={COLORS.error} />}
              <Text style={styles.modalTitle}>{scanResult?.success ? 'Sucesso!' : 'Erro'}</Text>
              <Text style={styles.modalMessage}>{scanResult?.message}</Text>
              <TouchableOpacity style={styles.modalButton} onPress={handleClose}>
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#fff' }]}>Escanear QR Code</Text>
          <View style={{ width: 40 }} />
        </View>

        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.instructionText}>Posicione o QR code dentro da moldura</Text>
            {Platform.OS === 'web' && (
              <View style={styles.webManualBelowCamera}>
                {!showWebManual ? (
                  <TouchableOpacity onPress={() => setShowWebManual(true)} hitSlop={12}>
                    <Text style={styles.webManualLink}>Ou digite o código manualmente</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TextInput
                      style={styles.webManualInputOnCamera}
                      value={manualCode}
                      onChangeText={setManualCode}
                      placeholder="FY:USER:... ou UUID"
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!manualBusy}
                    />
                    <TouchableOpacity style={styles.webManualBtnSmall} onPress={submitManualWeb} disabled={manualBusy}>
                      {manualBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.webManualBtnText}>Registrar</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowWebManual(false); setManualCode(''); }}>
                      <Text style={styles.webManualCancel}>Fechar entrada manual</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </CameraView>

        <Modal visible={showModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              {scanResult?.success ? <CheckCircle size={64} color={COLORS.success} /> : <XCircle size={64} color={COLORS.error} />}
              <Text style={styles.modalTitle}>{scanResult?.success ? 'Sucesso!' : 'Erro'}</Text>
              <Text style={styles.modalMessage}>{scanResult?.message}</Text>
              <TouchableOpacity style={styles.modalButton} onPress={handleClose}>
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SPACING.LG,
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionText: {
    ...TYPOGRAPHY.body,
    color: '#fff',
    marginTop: SPACING.XL,
    textAlign: 'center',
    paddingHorizontal: SPACING.MD,
  },
  webManualBelowCamera: {
    marginTop: SPACING.LG,
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: SPACING.MD,
    alignItems: 'stretch',
  },
  webManualLink: {
    ...TYPOGRAPHY.body,
    color: '#fff',
    textAlign: 'center',
    textDecorationLine: 'underline',
    opacity: 0.95,
  },
  webManualInputOnCamera: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginBottom: SPACING.SM,
  },
  webManualBtnSmall: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  webManualCancel: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: SPACING.SM,
  },
  webManualInput: {
    alignSelf: 'stretch',
    maxWidth: 420,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.MD,
  },
  webManualBtn: {
    alignSelf: 'stretch',
    maxWidth: 420,
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  webManualBtnText: {
    ...TYPOGRAPHY.body,
    color: '#fff',
    fontWeight: '600',
  },
  webDividerLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  permissionMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  permissionText: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACING.LG,
    marginBottom: SPACING.SM,
  },
  permissionSubtext: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginBottom: SPACING.LG,
  },
  retryButton: {
    ...globalStyles.button,
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    ...globalStyles.buttonText,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.XL,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  modalMessage: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  modalButton: {
    ...globalStyles.button,
    backgroundColor: COLORS.primary,
    width: '100%',
  },
  modalButtonText: {
    ...globalStyles.buttonText,
  },
});
