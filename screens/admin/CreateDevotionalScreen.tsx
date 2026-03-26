import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Platform, StatusBar, Modal, KeyboardAvoidingView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Trash2 } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Gradient from '../../components/ui/Gradient';
import DismissKeyboardView from '../../components/DismissKeyboardView';
import { createDevotional, deleteDevotional, supabase } from '../../services/supabase';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, globalStyles, SHADOWS } from '../../constants/theme';
import { Devotional } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';

type CreateDevotionalRouteProp = RouteProp<RootStackParamList, 'CreateDevotional'>;

export default function CreateDevotionalScreen() {
  const navigation = useNavigation();
  const route = useRoute<CreateDevotionalRouteProp>();
  const devotionalToEdit = route.params?.devotional;

  const [formData, setFormData] = useState({
    author: '',
    title: '',
    date: '',
    category: 'faith' as const,
    scripture: '',
    content: '',
    reflection: '',
    prayerPoints: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (devotionalToEdit) {
      const authorVal = (devotionalToEdit.author && String(devotionalToEdit.author).trim())
        ? String(devotionalToEdit.author).trim()
        : (devotionalToEdit.authorName !== undefined && devotionalToEdit.authorName !== '—' ? devotionalToEdit.authorName : '');
      setFormData({
        author: authorVal,
        title: devotionalToEdit.title || '',
        date: devotionalToEdit.date || '',
        category: devotionalToEdit.category || 'faith',
        scripture: devotionalToEdit.scripture || '',
        content: devotionalToEdit.content || '',
        reflection: devotionalToEdit.reflection || '',
        prayerPoints: Array.isArray(devotionalToEdit.prayer_points) ? devotionalToEdit.prayer_points.join('\n') : '',
      });
    }
  }, [devotionalToEdit]);

  const categories: Array<{ value: Devotional['category']; label: string }> = [
    { value: 'faith', label: 'Fé' },
    { value: 'love', label: 'Amor' },
    { value: 'hope', label: 'Esperança' },
    { value: 'courage', label: 'Coragem' },
    { value: 'wisdom', label: 'Sabedoria' },
  ];

  const isFormValid = () => {
    return (
      formData.title.trim() !== '' &&
      formData.date.trim() !== '' &&
      formData.scripture.trim() !== '' &&
      formData.content.trim() !== '' &&
      formData.reflection.trim() !== ''
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setIsLoading(true);
    try {
      const prayerPointsArray = formData.prayerPoints
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p !== '');

      const payload = {
        title: formData.title.trim(),
        date: formData.date.trim(),
        category: formData.category,
        scripture: formData.scripture.trim(),
        content: formData.content.trim(),
        reflection: formData.reflection.trim(),
        prayer_points: prayerPointsArray,
        author: formData.author.trim() || null,
      };

      if (devotionalToEdit?.id) {
        const { error } = await supabase.from('devotionals').update(payload).eq('id', devotionalToEdit.id);
        if (error) throw error;
      } else {
        await createDevotional({ ...payload, author_id: null });
      }
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Erro', error.message ?? 'Não foi possível salvar o devocional.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!devotionalToEdit?.id) return;
    Alert.alert(
      'Excluir devocional',
      `Deseja realmente excluir "${formData.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDevotional(devotionalToEdit.id);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Erro', error.message ?? 'Não foi possível excluir.');
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
            <Gradient colors={[COLORS.gradientStart, COLORS.gradientMiddle]} style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{devotionalToEdit ? 'Editar Devocional' : 'Novo Devocional'}</Text>
            </Gradient>

            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
              showsVerticalScrollIndicator={false}
              scrollEnabled={!isLoading}
            >
            <View style={styles.formSection}>
              <Text style={styles.label}>Autor</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome do autor do devocional"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.author}
                onChangeText={(text) => setFormData({ ...formData, author: text })}
                editable={!isLoading}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Caminhando pela Fé"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                editable={!isLoading}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Data (AAAA-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                placeholder="2025-02-22"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.date}
                onChangeText={(text) => setFormData({ ...formData, date: text })}
                editable={!isLoading}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Categoria *</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      formData.category === cat.value && styles.categoryChipActive,
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat.value })}
                    disabled={isLoading}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        formData.category === cat.value && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Escritura *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Hebreus 11:1 - Agora a fé é..."
                placeholderTextColor={COLORS.textSecondary}
                value={formData.scripture}
                onChangeText={(text) => setFormData({ ...formData, scripture: text })}
                editable={!isLoading}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Conteúdo Devocional *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Escreva o conteúdo do devocional..."
                placeholderTextColor={COLORS.textSecondary}
                value={formData.content}
                onChangeText={(text) => setFormData({ ...formData, content: text })}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!isLoading}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Reflexão *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Pergunta para reflexão pessoal..."
                placeholderTextColor={COLORS.textSecondary}
                value={formData.reflection}
                onChangeText={(text) => setFormData({ ...formData, reflection: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isLoading}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Pontos de Oração (opcional)</Text>
              <Text style={styles.helperText}>Separe cada ponto com uma nova linha</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ore por força\nOre por sabedoria\nOre por paz"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.prayerPoints}
                onChangeText={(text) => setFormData({ ...formData, prayerPoints: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isLoading}
              />
            </View>

            {devotionalToEdit?.id && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={isLoading}>
                <Trash2 size={20} color={COLORS.error} />
                <Text style={styles.deleteButtonText}>Excluir devocional</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.submitButton,
                !isFormValid() && styles.submitButtonDisabled,
                isLoading && styles.submitButtonLoading,
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid() || isLoading}
            >
              {isLoading ? (
                <Text style={styles.submitButtonText}>{devotionalToEdit ? 'Salvando...' : 'Criando...'}</Text>
              ) : (
                <Text style={styles.submitButtonText}>{devotionalToEdit ? 'Salvar alterações' : 'Criar Devocional'}</Text>
              )}
            </TouchableOpacity>
            </ScrollView>

            <Modal visible={showSuccessModal} transparent animationType="fade">
              <View style={styles.modalBackdrop}>
                <View style={styles.modalContainer}>
                  <CheckCircle size={64} color={COLORS.success} />
                  <Text style={styles.modalTitle}>{devotionalToEdit ? 'Devocional atualizado!' : 'Devocional Criado!'}</Text>
                  <Text style={styles.modalMessage}>
                    O devocional "{formData.title}" foi {devotionalToEdit ? 'atualizado' : 'criado'} com sucesso e está disponível para todos os jovens.
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
    height: 120,
    paddingTop: SPACING.MD,
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.SM,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
  },
  categoryChip: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  categoryChipText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.text,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  submitButton: {
    ...globalStyles.button,
    backgroundColor: COLORS.success,
    marginTop: SPACING.MD,
    marginBottom: SPACING.XXL,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  submitButtonLoading: {
    opacity: 0.7,
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