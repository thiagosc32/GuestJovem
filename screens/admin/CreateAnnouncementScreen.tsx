import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Platform, StatusBar, Modal, KeyboardAvoidingView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Trash2 } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Gradient from '../../components/ui/Gradient';
import DismissKeyboardView from '../../components/DismissKeyboardView';
import { supabase } from '../../services/supabase';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, globalStyles, SHADOWS } from '../../constants/theme';
import { RootStackParamList } from '../../types/navigation';

type CreateAnnouncementRouteProp = RouteProp<RootStackParamList, 'CreateAnnouncement'>;

const PRIORITY_OPTIONS = [
  { value: 'low' as const, label: 'Baixa' },
  { value: 'medium' as const, label: 'Média' },
  { value: 'high' as const, label: 'Alta' },
];

const ACTION_OPTIONS = [
  { value: 'none', label: 'Nenhum' },
  { value: 'events', label: 'Eventos' },
  { value: 'prayer', label: 'Oração' },
  { value: 'devotional', label: 'Devocional' },
];

export default function CreateAnnouncementScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<CreateAnnouncementRouteProp>();
  const announcementToEdit = route.params?.announcement;

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    action_type: 'none',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (announcementToEdit) {
      setFormData({
        title: announcementToEdit.title || '',
        message: announcementToEdit.message || '',
        priority: announcementToEdit.priority || 'medium',
        action_type: announcementToEdit.action_type || 'none',
      });
    }
  }, [announcementToEdit]);

  const isFormValid = () => {
    return formData.title.trim() !== '' && formData.message.trim() !== '';
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert('Campos obrigatórios', 'Preencha o título e a mensagem.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        action_type: formData.action_type,
      };

      if (announcementToEdit?.id) {
        const { error } = await supabase.from('announcements').update(payload).eq('id', announcementToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('announcements').insert([{ ...payload, is_active: true }]);
        if (error) throw error;
      }
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Erro', error.message ?? 'Não foi possível salvar o aviso.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!announcementToEdit?.id) return;
    Alert.alert(
      'Excluir aviso',
      `Deseja realmente excluir o aviso "${formData.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('announcements').delete().eq('id', announcementToEdit.id);
              if (error) throw error;
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Erro', error.message ?? 'Não foi possível excluir o aviso.');
            }
          },
        },
      ]
    );
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <DismissKeyboardView style={{ flex: 1 }}>
            <Gradient colors={[theme.gradientStart, theme.gradientMiddle]} style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{announcementToEdit ? 'Editar Aviso' : 'Novo Aviso'}</Text>
            </Gradient>

            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
              showsVerticalScrollIndicator={false}
              scrollEnabled={!isLoading}
            >
              <View style={styles.formSection}>
                <Text style={styles.label}>Título do Aviso *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Reunião de Líderes"
                  placeholderTextColor={COLORS.textSecondary}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Mensagem *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Escreva o conteúdo..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={formData.message}
                  onChangeText={(text) => setFormData({ ...formData, message: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Prioridade</Text>
                <View style={styles.priorityGrid}>
                  {PRIORITY_OPTIONS.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={[
                        styles.priorityChip,
                        formData.priority === p.value && {
                          backgroundColor: p.value === 'high' ? COLORS.error : p.value === 'medium' ? COLORS.secondary : COLORS.success,
                          borderColor: 'transparent',
                        },
                      ]}
                      onPress={() => setFormData({ ...formData, priority: p.value })}
                      disabled={isLoading}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          formData.priority === p.value && { color: '#fff' },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Ação ao Clicar</Text>
                <View style={[styles.priorityGrid, { flexWrap: 'wrap' }]}>
                  {ACTION_OPTIONS.map((action) => (
                    <TouchableOpacity
                      key={action.value}
                      style={[
                        styles.actionChip,
                        formData.action_type === action.value && styles.actionChipActive,
                      ]}
                      onPress={() => setFormData({ ...formData, action_type: action.value })}
                      disabled={isLoading}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          formData.action_type === action.value && { color: '#fff' },
                        ]}
                      >
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {announcementToEdit?.id && (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={isLoading}>
                  <Trash2 size={20} color={COLORS.error} />
                  <Text style={styles.deleteButtonText}>Excluir aviso</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!isFormValid() || isLoading) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!isFormValid() || isLoading}
              >
                {isLoading ? (
                  <Text style={styles.submitButtonText}>Salvando...</Text>
                ) : (
                  <Text style={styles.submitButtonText}>Salvar Aviso</Text>
                )}
              </TouchableOpacity>
            </ScrollView>

            <Modal visible={showSuccessModal} transparent animationType="fade">
              <View style={styles.modalBackdrop}>
                <View style={styles.modalContainer}>
                  <CheckCircle size={64} color={COLORS.success} />
                  <Text style={styles.modalTitle}>{announcementToEdit ? 'Aviso atualizado!' : 'Aviso criado!'}</Text>
                  <Text style={styles.modalMessage}>
                    O aviso "{formData.title}" foi {announcementToEdit ? 'atualizado' : 'criado'} com sucesso.
                  </Text>
                  <TouchableOpacity style={styles.modalButton} onPress={handleSuccessClose}>
                    <Text style={styles.modalButtonText}>Concluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
        </DismissKeyboardView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 55,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  formSection: {
    marginBottom: SPACING.LG,
  },
  label: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginBottom: SPACING.SM,
  },
  input: {
    ...globalStyles.input,
  },
  textArea: {
    height: 100,
    paddingTop: SPACING.MD,
    textAlignVertical: 'top',
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  priorityChip: {
    flex: 1,
    padding: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  actionChip: {
    width: '47%',
    marginBottom: 8,
    padding: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  actionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: 'transparent',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: BORDER_RADIUS.MD,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    ...globalStyles.button,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XXL,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.7,
  },
  submitButtonText: {
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
    ...SHADOWS.large,
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
    color: COLORS.textSecondary,
  },
  modalButton: {
    ...globalStyles.button,
    backgroundColor: COLORS.success,
    width: '100%',
  },
  modalButtonText: {
    ...globalStyles.buttonText,
  },
});
