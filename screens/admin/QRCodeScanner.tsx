import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, globalStyles } from '../../constants/theme';
import { mockUsers } from '../../data/mockData';

export default function QRCodeScanner() {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; name?: string; message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      requestCameraPermission();
    }
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    const user = mockUsers.find((u) => u.id === data);

    if (user) {
      setScanResult({
        success: true,
        name: user.name,
        message: `${user.name} registrado com sucesso!`,
      });
    } else {
      setScanResult({
        success: false,
        message: 'Usuário não encontrado. Tente novamente.',
      });
    }
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setScanResult(null);
    setScanned(false);
  };

  if (Platform.OS === 'web') {
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
          <View style={styles.webMessage}>
            <Text style={styles.webMessageText}>Leitura de QR Code não disponível na web.</Text>
            <Text style={styles.webMessageSubtext}>Use o aplicativo móvel para escanear códigos QR de presença.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.permissionSubtext}>Habilite o acesso à câmera nas configurações para escanear códigos QR.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={requestCameraPermission}>
              <Text style={styles.retryButtonText}>Solicitar Permissão</Text>
            </TouchableOpacity>
          </View>
        </View>
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
          </View>
        </CameraView>

        <Modal visible={showModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              {scanResult?.success ? (
                <CheckCircle size={64} color={COLORS.success} />
              ) : (
                <XCircle size={64} color={COLORS.error} />
              )}
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
  },
  webMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  webMessageText: {
    ...TYPOGRAPHY.h3,
    textAlign: 'center',
    marginBottom: SPACING.SM,
  },
  webMessageSubtext: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    color: COLORS.textSecondary,
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