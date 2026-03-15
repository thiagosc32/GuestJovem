import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ImageIcon, ArrowLeft, BookOpen, Calendar, Layout } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../services/supabase';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/dimensions';
import { TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';

export default function AppSettingsScreen() {
  const navigation = useNavigation();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [currentImages, setCurrentImages] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCurrentSettings();
  }, []);

  const fetchCurrentSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*');
    if (data) {
      const settingsMap = data.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
      setCurrentImages(settingsMap);
    }
  };

  const handleUpdateImage = async (key: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: key === 'events_hero_image' ? [16, 9] : [4, 2],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      try {
        setLoadingKey(key);
        const file = result.assets[0];
        const fileName = `${key}-${Date.now()}.jpg`;
        const filePath = `app-ui/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(filePath, decode(file.base64!), { contentType: 'image/jpeg', upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('app_settings')
          .update({ value: publicUrl })
          .eq('key', key);

        if (dbError) throw dbError;

        setCurrentImages(prev => ({ ...prev, [key]: publicUrl }));
        Alert.alert('Sucesso', 'Visual atualizado!');
      } catch (error: any) {
        Alert.alert('Erro', error.message);
      } finally {
        setLoadingKey(null);
      }
    }
  };

  const ConfigItem = ({ title, sub, icon: Icon, dbKey }: any) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <View style={styles.iconBox}><Icon size={24} color={COLORS.primary} /></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSub}>{sub}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={[styles.btn, loadingKey === dbKey && { opacity: 0.6 }]} 
        onPress={() => handleUpdateImage(dbKey)}
        disabled={!!loadingKey}
      >
        {loadingKey === dbKey ? <ActivityIndicator size="small" color="#fff" /> : <ImageIcon size={18} color="#fff" />}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color={COLORS.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Personalizar App</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.LG }}>
        <View style={styles.sectionTitleWrap}>
          <Layout size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Eventos e atividades</Text>
        </View>
        <ConfigItem title="Banner de Eventos" sub="Imagem principal da tela de eventos" icon={Layout} dbKey="events_hero_image" />
        <View style={styles.sectionTitleWrap}>
          <BookOpen size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Imagens do app (Home)</Text>
        </View>
        <ConfigItem title="Card de Devocionais" sub="Fundo do card na Home" icon={BookOpen} dbKey="card_devotional_bg" />
        <ConfigItem title="Card de Próximo Evento" sub="Fundo do card na Home" icon={Calendar} dbKey="card_next_event_bg" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.LG, backgroundColor: '#fff' },
  headerTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', ...SHADOWS.small },
  cardInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 45, height: 45, borderRadius: 12, backgroundColor: `${COLORS.primary}10`, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.textSecondary },
  btn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 12 },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
});