import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY } from '../../constants/theme';
import { churchAdminUpdateBranding, getCurrentUser, getChurchBrandingById } from '../../services/supabase';
import { useChurchBranding } from '../../contexts/ChurchBrandingContext';

export default function ChurchBrandingSettingsScreen() {
  const navigation = useNavigation();
  const { refresh } = useChurchBranding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ministryName, setMinistryName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        const cid = u && 'church_id' in u ? (u as { church_id?: string | null }).church_id : null;
        if (!cid) {
          setLoading(false);
          return;
        }
        const row = await getChurchBrandingById(cid);
        if (row) {
          setMinistryName(row.ministry_name ?? '');
          setLogoUrl(row.logo_url ?? '');
          setPrimary(row.primary_color ?? '');
          setSecondary(row.secondary_color ?? '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await churchAdminUpdateBranding({
        ministryName: ministryName.trim(),
        logoUrl: logoUrl.trim() || null,
        primaryColor: primary.trim() || null,
        secondaryColor: secondary.trim() || null,
      });
      if (!(res as any)?.success) throw new Error((res as any)?.error ?? 'Erro');
      await refresh();
      Alert.alert('Salvo', 'Identidade visual atualizada.');
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? '');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <ArrowLeft size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Identidade da igreja</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nome do ministério (exibido no app)</Text>
        <TextInput
          style={styles.input}
          value={ministryName}
          onChangeText={setMinistryName}
          placeholder="Ministério Jovem Vida"
          placeholderTextColor={COLORS.textLight}
        />
        <Text style={styles.label}>URL do logo (opcional)</Text>
        <TextInput
          style={styles.input}
          value={logoUrl}
          onChangeText={setLogoUrl}
          placeholder="https://..."
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
        />
        <Text style={styles.label}>Cor principal (hex, opcional)</Text>
        <TextInput
          style={styles.input}
          value={primary}
          onChangeText={setPrimary}
          placeholder="#1976D2"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
        />
        <Text style={styles.label}>Cor secundária (hex, opcional)</Text>
        <TextInput
          style={styles.input}
          value={secondary}
          onChangeText={setSecondary}
          placeholder="#FF6F00"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Salvar</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.MD },
  back: { padding: 4, marginRight: SPACING.SM },
  title: { ...TYPOGRAPHY.h3, color: COLORS.text, flex: 1 },
  content: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  label: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    padding: 12,
    marginBottom: SPACING.MD,
    color: COLORS.text,
  },
  btn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    marginTop: SPACING.SM,
  },
  btnTxt: { color: '#fff', fontWeight: '600' },
});
