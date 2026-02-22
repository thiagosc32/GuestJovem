import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, User, Mail, Phone, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { COLORS } from '../../constants/colors';

export default function RegistrationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId } = route.params as { eventId: string };

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

 const handleRegister = async () => {
    if (!formData.full_name || !formData.email || !formData.phone) {
      Alert.alert("Campos obrigatórios", "Por favor, preencha todos os campos para garantir sua vaga.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('event_registrations')
        .insert([
          {
            event_id: eventId,
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
          }
        ]);

      if (error) throw error;

      Alert.alert(
        "Inscrição Confirmada!",
        "Sua vaga foi garantida com sucesso. Nos vemos lá!",
        [{ 
          text: "OK", 
          onPress: () => {
            // 1. Executa a função que enviamos da EventsScreen para mudar o botão lá
            if (route.params?.onSuccess) {
              route.params.onSuccess();
            }
            // 2. Volta para a tela de eventos
            navigation.goBack(); 
          } 
        }]
      );
    } catch (error: any) {
      Alert.alert("Erro", "Não foi possível concluir sua inscrição: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inscrição no Evento</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.introSection}>
            <CheckCircle2 size={48} color={COLORS.primary} />
            <Text style={styles.title}>Quase lá!</Text>
            <Text style={styles.subtitle}>Preencha seus dados abaixo para confirmar sua participação.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Nome Completo</Text>
            <View style={styles.inputContainer}>
              <User size={20} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="Ex: João Silva"
                value={formData.full_name}
                onChangeText={(t) => setFormData({...formData, full_name: t})}
              />
            </View>

            <Text style={styles.label}>E-mail</Text>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(t) => setFormData({...formData, email: t})}
              />
            </View>

            <Text style={styles.label}>WhatsApp / Telefone</Text>
            <View style={styles.inputContainer}>
              <Phone size={20} color="#64748B" />
              <TextInput
                style={styles.input}
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(t) => setFormData({...formData, phone: t})}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Confirmar Inscrição</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginLeft: 8 },
  scrollContent: { padding: 24 },
  introSection: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', marginTop: 8 },
  form: { gap: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: -12 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#0F172A' },
  submitButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});