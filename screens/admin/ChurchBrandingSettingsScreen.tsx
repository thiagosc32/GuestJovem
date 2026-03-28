import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { ArrowLeft, ImagePlus } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { TYPOGRAPHY } from '../../constants/theme';
import { supabase, churchAdminUpdateBranding, getCurrentUser, getChurchBrandingById } from '../../services/supabase';
import { useChurchBranding } from '../../contexts/ChurchBrandingContext';
import { ChurchBrandingColorField } from '../../components/admin/ChurchBrandingColorField';

export default function ChurchBrandingSettingsScreen() {
  const navigation = useNavigation();
  const { refresh } = useChurchBranding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [ministryName, setMinistryName] = useState('');
  const [ministrySlogan, setMinistrySlogan] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        const cid = u && 'church_id' in u ? (u as { church_id?: string | null }).church_id : null;
        if (!cid) {
          setLoading(false);
          return;
        }
        setChurchId(cid);
        const row = await getChurchBrandingById(cid);
        if (row) {
          setMinistryName(row.ministry_name ?? '');
          setMinistrySlogan(row.ministry_slogan ?? '');
          setLogoUrl(row.logo_url ?? '');
          setPrimary(row.primary_color ?? '');
          setSecondary(row.secondary_color ?? '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pickLogoFromLibrary = async () => {
    if (!churchId) {
      Alert.alert('Erro', 'Igreja não identificada.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão', 'É preciso permitir o acesso às fotos para escolher o logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const file = result.assets[0];
    const b64 = file.base64;
    if (!b64) {
      Alert.alert('Erro', 'Não foi possível ler a imagem. Tente outra foto.');
      return;
    }
    setUploadingLogo(true);
    try {
      const fileName = `logo-${Date.now()}.jpg`;
      const filePath = `church-logos/${churchId}/${fileName}`;
      const { error } = await supabase.storage
        .from('assets')
        .upload(filePath, decode(b64), { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from('assets').getPublicUrl(filePath);
      setLogoUrl(publicUrl);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha no envio do logo.';
      Alert.alert('Erro', msg);
    } finally {
      setUploadingLogo(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await churchAdminUpdateBranding({
        ministryName: ministryName.trim(),
        ministrySlogan: ministrySlogan.trim(),
        logoUrl: logoUrl.trim(),
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
        <Text style={styles.label}>Nome do ministério / título do menu (☰)</Text>
        <Text style={styles.hint}>
          Aparece no topo do menu lateral (☰). Se ainda não houver nome do ministério definido, usa-se o nome oficial da igreja; fora disso, &quot;Guest Jovem&quot;.
        </Text>
        <TextInput
          style={styles.input}
          value={ministryName}
          onChangeText={setMinistryName}
          placeholder="Ministério Jovem Vida"
          placeholderTextColor={COLORS.textLight}
        />
        <Text style={styles.label}>Slogan do ministério (opcional)</Text>
        <Text style={styles.hint}>
          Aparece abaixo do nome do ministério na tela de login quando alguém entra pelo convite. Se ficar vazio, usa-se a frase padrão do app.
        </Text>
        <TextInput
          style={styles.input}
          value={ministrySlogan}
          onChangeText={setMinistrySlogan}
          placeholder="Ex.: Uma geração em chamas pelo Evangelho"
          placeholderTextColor={COLORS.textLight}
          multiline
        />
        <Text style={styles.label}>Logo (opcional)</Text>
        <Text style={styles.hint}>
          Escolha uma imagem da galeria. Ela será usada no menu e na tela de login quando alguém entrar pelo convite da igreja.
        </Text>
        <View style={styles.logoRow}>
          <View style={styles.logoPreviewWrap}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logoPreview} resizeMode="contain" />
            ) : (
              <View style={styles.logoPlaceholder}>
                <ImagePlus size={28} color={COLORS.textLight} />
              </View>
            )}
          </View>
          <View style={styles.logoActions}>
            <TouchableOpacity
              style={[styles.logoBtn, uploadingLogo && styles.logoBtnDisabled]}
              onPress={pickLogoFromLibrary}
              disabled={uploadingLogo || !churchId}
            >
              {uploadingLogo ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.logoBtnTxt}>{logoUrl ? 'Trocar foto' : 'Escolher foto'}</Text>
              )}
            </TouchableOpacity>
            {!!logoUrl && (
              <TouchableOpacity style={styles.logoRemoveBtn} onPress={() => setLogoUrl('')} disabled={uploadingLogo}>
                <Text style={styles.logoRemoveTxt}>Remover logo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <ChurchBrandingColorField
          label="Cor principal (opcional)"
          value={primary}
          onChange={setPrimary}
          placeholder="#1976D2"
        />
        <ChurchBrandingColorField
          label="Cor secundária (opcional)"
          value={secondary}
          onChange={setSecondary}
          placeholder="#FF6F00"
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
  hint: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: SPACING.SM, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.MD,
    padding: 12,
    marginBottom: SPACING.MD,
    color: COLORS.text,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  logoPreviewWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  logoPreview: { width: '100%', height: '100%' },
  logoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoActions: { flex: 1, gap: 8 },
  logoBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
  },
  logoBtnDisabled: { opacity: 0.7 },
  logoBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 15 },
  logoRemoveBtn: { paddingVertical: 6 },
  logoRemoveTxt: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 14 },
  btn: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    marginTop: SPACING.SM,
  },
  btnTxt: { color: '#fff', fontWeight: '600' },
});
