import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, CreditCard, CheckCircle2, ExternalLink } from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { COLORS } from '../../constants/colors';

export default function EventPaymentScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { eventId } = (route.params as { eventId: string }) || {};

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();
        if (error) throw error;
        setEvent(data);
      } catch (e) {
        console.error(e);
        Alert.alert('Erro', 'Não foi possível carregar o evento.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const priceFormatted =
    event?.price != null && event?.price > 0
      ? Number(event.price).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      : '';

  const openPaymentLink = () => {
    const url = event?.payment_url?.trim();
    if (!url) {
      Alert.alert(
        'Link não configurado',
        'Este evento ainda não possui link de pagamento. Entre em contato com a organização.'
      );
      return;
    }
    Linking.openURL(url).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o link de pagamento.')
    );
  };

  const goToRegistration = () => {
    navigation.navigate('RegistrationScreen', {
      eventId,
      onSuccess: () => navigation.goBack(),
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.eventTitle}>{event?.title ?? 'Evento'}</Text>
          <View style={styles.priceRow}>
            <CreditCard size={24} color={COLORS.primary} />
            <Text style={styles.priceLabel}>Valor do ingresso</Text>
            <Text style={styles.priceValue}>{priceFormatted}</Text>
          </View>
        </View>

        {event?.payment_url ? (
          <TouchableOpacity style={styles.primaryButton} onPress={openPaymentLink}>
            <ExternalLink size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Pagar agora</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.noLinkBox}>
            <Text style={styles.noLinkText}>
              Link de pagamento não configurado para este evento. Entre em contato com a organização para obter as instruções de pagamento.
            </Text>
          </View>
        )}

        <Text style={styles.dividerText}>ou</Text>

        <TouchableOpacity style={styles.secondaryButton} onPress={goToRegistration}>
          <CheckCircle2 size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={styles.secondaryButtonText}>Já paguei, fazer inscrição</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Após realizar o pagamento, volte aqui e toque em "Já paguei, fazer inscrição" para preencher seus dados e garantir sua vaga.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content: { padding: 24 },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  eventTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  priceLabel: { fontSize: 16, color: COLORS.textSecondary, marginLeft: 10, marginRight: 8 },
  priceValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  noLinkBox: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  noLinkText: { fontSize: 14, color: '#92400E', lineHeight: 22 },
  dividerText: {
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.textSecondary,
    marginVertical: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  hint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});
