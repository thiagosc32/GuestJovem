import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Edit3, Calendar as CalendarIcon, Clock, ImagePlus, X } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

import { supabase } from '../../services/supabase';
import Gradient from '../../components/ui/Gradient';
import { COLORS } from '../../constants/colors';
import { RootStackParamList } from '../../types/navigation';

type CreateEventRouteProp = RouteProp<RootStackParamList, 'CreateEventScreen'>;

export default function CreateEventScreen() {
  const navigation = useNavigation();
  const route = useRoute<CreateEventRouteProp>();
  const eventToEdit = route.params?.event;

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [formData, setFormData] = useState({
    event_type: '',
    title: '',
    date: new Date(),
    time: '19:30',
    location: '',
    description: '',
    image_url: '',
    requires_registration: false,
    is_paid: false,
    price: '',
    payment_url: '',
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const eventTypes = ['Culto', 'Oração', 'Vigília', 'Confraternização'];
  const titlePresets = ['Guest Fire', 'Guest-Lover', 'Guest-Play', 'Table', 'Overnight', 'Outside'];

  useEffect(() => {
    if (eventToEdit) {
      const ev = eventToEdit as any;
      const date = ev.date ? new Date(ev.date + 'T12:00:00') : new Date();
      const eventType = ev.event_type === 'Vigilia' ? 'Vigília' : (ev.event_type || '');
      setFormData({
        event_type: eventType,
        title: ev.title || '',
        date,
        time: ev.time || '19:30',
        location: ev.location || '',
        description: ev.description || '',
        image_url: ev.image_url || '',
        requires_registration: ev.requires_registration ?? false,
        is_paid: ev.is_paid ?? false,
        price: ev.price ? String(ev.price) : '',
        payment_url: ev.payment_url ?? '',
      });
    }
  }, [eventToEdit]);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      // No Android o calendário nativo só dispara onChange ao tocar em OK/Cancelar; fechar o modal aqui.
      setShowDatePicker(false);
    }
    if (selectedDate) setFormData((prev) => ({ ...prev, date: selectedDate }));
  };

  const parseTimeToDate = (timeStr: string): Date => {
    const [h = 19, m = 30] = timeStr.split(':').map(Number);
    const d = new Date(formData.date);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const onChangeTime = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      const h = String(selectedDate.getHours()).padStart(2, '0');
      const m = String(selectedDate.getMinutes()).padStart(2, '0');
      setFormData((prev) => ({ ...prev, time: `${h}:${m}` }));
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Aviso', 'Precisamos de permissão para acessar suas fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        setIsUploadingImage(true);
        const file = result.assets[0];
        const fileName = `event-${Date.now()}.jpg`;
        const filePath = `events/${fileName}`;
        const { error } = await supabase.storage
          .from('assets')
          .upload(filePath, decode(file.base64!), { contentType: 'image/jpeg', upsert: true });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(filePath);
        setFormData({ ...formData, image_url: publicUrl });
      } catch (err: any) {
        Alert.alert('Erro', err.message || 'Não foi possível enviar a imagem.');
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const handleRemoveImage = () => setFormData({ ...formData, image_url: '' });

 const handleSubmit = async () => {
  if (!formData.title || !formData.description || !formData.event_type) {
    Alert.alert("Erro", "Preencha o título, tipo e descrição.");
    return;
  }

  setIsLoading(true);

  try {
    const year = formData.date.getFullYear();
    const month = String(formData.date.getMonth() + 1).padStart(2, '0');
    const day = String(formData.date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    const categoryMap: { [key: string]: string } = {
      'Culto': 'worship',
      'Oração': 'outreach',
      'Vigília': 'worship',
      'Confraternização': 'fellowship',
    };
    const categoryToSave = categoryMap[formData.event_type] || 'worship';
    const eventTypeForDb = formData.event_type === 'Vigília' ? 'Vigilia' : formData.event_type;

    const payload = {
      title: formData.title,
      event_title: formData.title,
      description: formData.description,
      date: formattedDate,
      time: formData.time,
      location: formData.location,
      image_url: formData.image_url || null,
      requires_registration: formData.requires_registration,
      is_paid: formData.is_paid,
      price: formData.is_paid ? parseFloat(String(formData.price).replace(',', '.')) : 0,
      payment_url: formData.is_paid && formData.payment_url?.trim() ? formData.payment_url.trim() : null,
      category: categoryToSave,
      event_type: eventTypeForDb,
    };

    if (eventToEdit?.id) {
      const { error } = await supabase.from('events').update(payload).eq('id', eventToEdit.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('events').insert([payload]);
      if (error) throw error;
    }

    setShowSuccessModal(true);
  } catch (error: any) {
    console.error(error);
    Alert.alert('Erro ao salvar', error.message);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="light-content" />

      {/* KeyboardAvoidingView envolve o conteúdo para ajustar a altura quando o teclado sobe */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <Gradient colors={[COLORS.gradientStart, COLORS.gradientMiddle]} style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{eventToEdit ? 'Editar Evento' : 'Novo Evento'}</Text>
            </Gradient>

            <ScrollView 
              contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Título do Evento *</Text>
              <View style={[styles.chipGrid, { marginBottom: 10 }]}>
                {titlePresets.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, formData.title === item && styles.chipActive]}
                    onPress={() => setFormData({ ...formData, title: item })}
                  >
                    <Text style={[styles.chipText, formData.title === item && styles.chipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputContainer}>
                <Edit3 size={18} color="#999" style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, height: 45 }}
                  placeholder="Ou digite o nome..."
                  value={formData.title}
                  onChangeText={(t) => setFormData({ ...formData, title: t })}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Data *</Text>
                  <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                    <CalendarIcon size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: '#333' }}>{formData.date.toLocaleDateString('pt-BR')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Hora</Text>
                  <TouchableOpacity style={styles.dateSelector} onPress={() => setShowTimePicker(true)}>
                    <Clock size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: '#333' }}>{formData.time}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>Tipo de Atividade *</Text>
              <View style={styles.chipGrid}>
                {eventTypes.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, formData.event_type === item && styles.chipActive]}
                    onPress={() => setFormData({ ...formData, event_type: item })}
                  >
                    <Text style={[styles.chipText, formData.event_type === item && styles.chipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>Imagem do Evento</Text>
              <View style={styles.imageSection}>
                {formData.image_url ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: formData.image_url }} style={styles.imagePreview} resizeMode="cover" />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={handleRemoveImage}>
                      <X size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.addImageButton, isUploadingImage && styles.addImageButtonDisabled]}
                    onPress={handlePickImage}
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator color={COLORS.primary} />
                    ) : (
                      <>
                        <ImagePlus size={28} color={COLORS.primary} />
                        <Text style={styles.addImageText}>Adicionar imagem</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>Local</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Templo Sede"
                value={formData.location}
                onChangeText={(t) => setFormData({ ...formData, location: t })}
              />

              <Text style={[styles.label, { marginTop: 20 }]}>Descrição Detalhada *</Text>
              <TextInput
                style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
                placeholder="Descreva o evento..."
                multiline
                value={formData.description}
                onChangeText={(t) => setFormData({ ...formData, description: t })}
              />

              <View style={styles.logicBox}>
                <View style={styles.switchRow}>
                  <Text style={styles.logicText}>Inscrição necessária?</Text>
                  <Switch
                    value={formData.requires_registration}
                    onValueChange={(val) => setFormData({ ...formData, requires_registration: val, is_paid: val ? formData.is_paid : false })}
                  />
                </View>
                {formData.requires_registration && (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#ddd', marginTop: 10, paddingTop: 10 }}>
                    <View style={styles.switchRow}>
                      <Text style={styles.logicText}>Evento pago?</Text>
                      <Switch value={formData.is_paid} onValueChange={(val) => setFormData({ ...formData, is_paid: val })} />
                    </View>
                    {formData.is_paid && (
                      <>
                        <TextInput
                          style={[styles.input, { marginTop: 10 }]}
                          placeholder="Valor R$"
                          keyboardType="numeric"
                          value={formData.price}
                          onChangeText={(t) => setFormData({ ...formData, price: t })}
                        />
                        <Text style={[styles.label, { marginTop: 12 }]}>Link de pagamento</Text>
                        <TextInput
                          style={[styles.input, { marginTop: 4 }]}
                          placeholder="https://... (Mercado Pago, PIX, etc.)"
                          keyboardType="url"
                          autoCapitalize="none"
                          value={formData.payment_url}
                          onChangeText={(t) => setFormData({ ...formData, payment_url: t })}
                        />
                      </>
                    )}
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{eventToEdit ? 'Salvar Alterações' : 'Publicar Evento'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* --- DATA: Android = nativo (já tem OK); iOS = modal com spinner e Confirmar --- */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={formData.date}
          mode="date"
          display="default"
          onChange={onChangeDate}
          minimumDate={eventToEdit ? undefined : new Date()}
          locale="pt-BR"
        />
      )}
      {Platform.OS === 'ios' && (
        <Modal transparent visible={showDatePicker} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.iosSheet}>
              <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Selecione a Data</Text></View>
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={formData.date}
                  mode="date"
                  display="spinner"
                  onChange={onChangeDate}
                  minimumDate={eventToEdit ? undefined : new Date()}
                  locale="pt-BR"
                  textColor="#000"
                  style={{ height: 220, width: '100%' }}
                />
              </View>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.confirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* --- HORA: Android = nativo (já tem OK); iOS = modal com spinner e Confirmar --- */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={parseTimeToDate(formData.time)}
          mode="time"
          display="default"
          onChange={onChangeTime}
          locale="pt-BR"
        />
      )}
      {Platform.OS === 'ios' && (
        <Modal transparent visible={showTimePicker} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.iosSheet}>
              <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Selecione a Hora</Text></View>
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={parseTimeToDate(formData.time)}
                  mode="time"
                  display="spinner"
                  onChange={onChangeTime}
                  locale="pt-BR"
                  textColor="#000"
                  style={{ height: 220, width: '100%' }}
                />
              </View>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowTimePicker(false)}>
                <Text style={styles.confirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* SUCESSO */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalBg}><View style={styles.modalContent}>
          <CheckCircle size={60} color="#28a745" />
          <Text style={styles.modalSuccessText}>{eventToEdit ? 'Evento Atualizado!' : 'Evento Criado!'}</Text>
          <TouchableOpacity style={styles.modalBtn} onPress={() => { setShowSuccessModal(false); navigation.goBack(); }}>
            <Text style={styles.modalBtnText}>Concluir</Text>
          </TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingTop: 50, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  backButton: { position: 'absolute', left: 20, top: 55 },
  label: { fontWeight: '700', color: '#444', marginBottom: 8, fontSize: 14 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: '#666' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', paddingHorizontal: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  input: { backgroundColor: '#f9f9f9', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#eee', color: '#333' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  imageSection: { marginTop: 8 },
  addImageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24, minHeight: 100, borderRadius: 12, borderWidth: 2, borderColor: '#ddd', borderStyle: 'dashed', backgroundColor: '#fafafa' },
  addImageButtonDisabled: { opacity: 0.6 },
  addImageText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  imagePreviewContainer: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 160, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  logicBox: { marginTop: 25, backgroundColor: '#f4f4f4', padding: 15, borderRadius: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 40 },
  logicText: { fontWeight: '600', color: '#333' },
  saveButton: { marginTop: 30, backgroundColor: COLORS.secondary, padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', padding: 30, borderRadius: 20, alignItems: 'center' },
  modalSuccessText: { fontSize: 22, fontWeight: 'bold', marginVertical: 15, color: '#333' },
  modalBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 10 },
  modalBtnText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  iosSheet: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 40, alignItems: 'center' },
  sheetHeader: { width: '100%', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  sheetTitle: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: '#333' },
  pickerContainer: { width: '100%', height: 220, justifyContent: 'flex-end' },
  confirmBtn: { backgroundColor: COLORS.primary, width: '100%', padding: 16, borderRadius: 15, marginTop: 15, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});