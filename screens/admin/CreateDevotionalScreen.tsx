import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Animated, Platform, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, BookOpen, CheckCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Gradient from '../../components/ui/Gradient';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY, globalStyles, SHADOWS } from '../../constants/theme';
import { Devotional } from '../../types/models';

export default function CreateDevotionalScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }
  }, []);

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

      const newDevotional: Devotional = {
        id: `${Date.now()}`,
        title: formData.title,
        date: formData.date,
        category: formData.category,
        scripture: formData.scripture,
        content: formData.content,
        reflection: formData.reflection,
        prayerPoints: prayerPointsArray,
        completed: false,
      };

      const existingDevotionals = await AsyncStorage.getItem('devotionals');
      const devotionals: Devotional[] = existingDevotionals ? JSON.parse(existingDevotionals) : [];
      devotionals.push(newDevotional);
      await AsyncStorage.setItem('devotionals', JSON.stringify(devotionals));

      console.log('Devocional criado:', newDevotional);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Erro ao criar devocional:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setFormData({
      title: '',
      date: '',
      category: 'faith',
      scripture: '',
      content: '',
      reflection: '',
      prayerPoints: '',
    });
    navigation.goBack();
  };

  const ContentWrapper = Platform.OS === 'web' ? View : Animated.View;
  const containerStyle = Platform.OS === 'web'
    ? [styles.container, isVisible && styles.visible]
    : [styles.container, { opacity: fadeAnim }];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <ContentWrapper style={containerStyle}>
          <Gradient
            colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <BookOpen size={32} color="#fff" />
              <Text style={styles.headerTitle}>Criar Devocional</Text>
              <Text style={styles.headerSubtitle}>Compartilhe uma mensagem inspiradora</Text>
            </View>
          </Gradient>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!isLoading}
          >
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
              <Text style={styles.label}>Data *</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
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
                <Text style={styles.submitButtonText}>Criando...</Text>
              ) : (
                <Text style={styles.submitButtonText}>Criar Devocional</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </ContentWrapper>

        <Modal visible={showSuccessModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <CheckCircle size={64} color={COLORS.success} />
              <Text style={styles.modalTitle}>Devocional Criado!</Text>
              <Text style={styles.modalMessage}>
                O devocional "{formData.title}" foi criado com sucesso e está disponível para todos os jovens.
              </Text>
              <TouchableOpacity style={styles.modalButton} onPress={handleSuccessClose}>
                <Text style={styles.modalButtonText}>Concluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      opacity: 0,
      transition: 'opacity 0.4s ease-out',
    }),
  },
  visible: {
    opacity: 1,
  },
  header: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.XL,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: SPACING.MD,
    left: SPACING.LG,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: '#fff',
    marginTop: SPACING.SM,
    marginBottom: SPACING.XS,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.LG,
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