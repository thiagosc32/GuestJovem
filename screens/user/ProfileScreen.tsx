import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Platform, 
  ActivityIndicator, 
  TextInput, 
  Modal, 
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Phone, Calendar, Award, LogOut, Edit, Camera, CheckCircle, X, Church, Briefcase, Users as UsersIcon, Shield } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';

import { supabase } from '../../services/supabase'; 
import Gradient from '../../components/ui/Gradient';
import ProgressCard from '../../components/ProgressCard';
import { COLORS } from '../../constants/colors';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { SHADOWS, TYPOGRAPHY } from '../../constants/theme';
import { mockAchievements } from '../../data/mockData';
import { UserProfile } from '../../types/models';

// Helper para decode sem biblioteca externa
const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};
const getRoleDetails = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'admin': return { color: '#EF4444', label: 'Admin' };
    case 'staff': return { color: '#F59E0B', label: 'Staff' };
    case 'volunteer': return { color: '#10B981', label: 'Voluntário' };
    default: return { color: COLORS.accent, label: 'Jovem' };
  }
};
const calcLevelFromAttendance = (days: number) => Math.min(10, 1 + Math.floor(days / 3));
const calcSpiritualProgress = (days: number, level: number) => Math.min(100, days * 4 + level * 5);

export default function ProfileScreen() {
  const navigation = useNavigation();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const infoFadeAnim = useRef(new Animated.Value(0)).current;

  const [isVisible, setIsVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [attendanceDays, setAttendanceDays] = useState(0);
  const [level, setLevel] = useState(1);
  const [spiritualProgress, setSpiritualProgress] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // RECOLOCADO: Estados do Voluntariado
  const [showVolunteerOtherInput, setShowVolunteerOtherInput] = useState(false);
  const [volunteerOtherText, setVolunteerOtherText] = useState('');

  const [profileData, setProfileData] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    bio: '',
    photoUri: '',
    church: '',
    calling: undefined,
    volunteer: [],
    role: 'jovem',
  });
  const [formData, setFormData] = useState<UserProfile>(profileData);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadProfileData();
    }, [])
  );

  const loadProfileData = async () => {
    try {
      let authUser = (await supabase.auth.getUser()).data?.user;
      if (!authUser) {
        await new Promise((r) => setTimeout(r, 500));
        authUser = (await supabase.auth.getUser()).data?.user;
      }
      if (!authUser) return;

      const userId = authUser.id;

      const { count: attendanceCount } = await supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      const days = attendanceCount ?? 0;
      const lvl = calcLevelFromAttendance(days);
      setAttendanceDays(days);
      setLevel(lvl);
      setSpiritualProgress(calcSpiritualProgress(days, lvl));

      const defaults: UserProfile = {
        name: '',
        email: authUser.email ?? '',
        phone: '',
        bio: '',
        photoUri: '',
        church: '',
        calling: undefined,
        volunteer: [],
        role: 'jovem',
      };

      const fetchUser = async () => {
        const { data, error } = await supabase.from('users').select('name, email, role, avatar_url, phone').eq('id', userId).single();
        if (error) throw error;
        return data;
      };

      let userData: any = null;
      try {
        userData = await fetchUser();
      } catch (e) {
        await new Promise((r) => setTimeout(r, 400));
        userData = await fetchUser();
      }

      if (!userData) return;

      const { data: youthData } = await supabase.from('youth_profiles').select('church, calling, volunteer').eq('user_id', userId).limit(1).maybeSingle();
      const youth = youthData as { church?: string; calling?: string; volunteer?: string[] } | null;

      const d = userData;
      const updatedProfile: UserProfile = {
        ...defaults,
        name: d.name || 'Usuário',
        email: d.email || authUser.email || '',
        phone: d.phone || '',
        role: (d.role as UserProfile['role']) || 'jovem',
        church: youth?.church ?? '',
        calling: (youth?.calling as UserProfile['calling']) ?? undefined,
        volunteer: youth?.volunteer ?? [],
        photoUri: d.avatar_url || '',
      };

      setIsAdmin(d.role === 'admin');
      setProfileData(updatedProfile);
      setFormData(updatedProfile);
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    } catch (error) {
      console.error('Erro ao sincronizar perfil:', error);
    }
  };

  const animateInfoSection = () => {
    infoFadeAnim.setValue(0);
    Animated.timing(infoFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Aviso", "Precisamos de permissão para acessar suas fotos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      let base64String = asset.base64;
      if (!base64String) {
        base64String = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      }
      uploadImage(asset.uri, base64String);
    }
  };

  const uploadImage = async (uri: string, base64: string) => {
    try {
      setIsUploading(true);
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      const arrayBuffer = decodeBase64(base64);

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, { contentType: `image/${fileExt}`, upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newFormData = { ...formData, photoUri: publicUrl };
      setFormData(newFormData);
      setProfileData(newFormData);

      // Persistir avatar_url no banco imediatamente para não perder no logout
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id);
        await AsyncStorage.setItem('userProfile', JSON.stringify(newFormData));
      }
    } catch (error: any) {
      Alert.alert("Erro no Upload", error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // RECOLOCADO: Lógica de seleção de Voluntário
  const handleVolunteerToggle = (option: string) => {
    if (option === 'outros') {
      setShowVolunteerOtherInput(!showVolunteerOtherInput);
      return;
    }
    const currentVolunteer = formData.volunteer || [];
    if (currentVolunteer.includes(option)) {
      setFormData({ ...formData, volunteer: currentVolunteer.filter((v) => v !== option) });
    } else {
      setFormData({ ...formData, volunteer: [...currentVolunteer, option] });
    }
  };

  const handleVolunteerOtherSubmit = () => {
    if (volunteerOtherText.trim()) {
      setFormData({ ...formData, volunteer: [...(formData.volunteer || []), volunteerOtherText.trim()] });
      setVolunteerOtherText('');
      setShowVolunteerOtherInput(false);
    }
  };

  const handleSaveProfile = async () => {
  if (!formData.name.trim() || !formData.email.trim()) return;
  setIsSaving(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const userUpdate: { name: string; avatar_url: string | null; church?: string; calling?: string; volunteer?: string[] } = {
      name: formData.name,
      avatar_url: formData.photoUri || null,
    };
    const youthPayload = {
      church: formData.church || null,
      calling: formData.calling || null,
      volunteer: (formData.volunteer && formData.volunteer.length > 0) ? formData.volunteer : null,
    };

    const { error: userError } = await supabase.from('users').update({ ...userUpdate, ...youthPayload }).eq('id', user.id);
    if (userError) {
      await supabase.from('users').update(userUpdate).eq('id', user.id);
      const { data: existingYouth } = await supabase.from('youth_profiles').select('id').eq('user_id', user.id).limit(1).maybeSingle();
      if (existingYouth) {
        const { error: youthErr } = await supabase.from('youth_profiles').update(youthPayload).eq('user_id', user.id);
        if (youthErr) throw youthErr;
      } else {
        const { error: youthErr } = await supabase.from('youth_profiles').insert({ user_id: user.id, baptized: false, ...youthPayload });
        if (youthErr) throw youthErr;
      }
    }

    await AsyncStorage.setItem('userProfile', JSON.stringify(formData));
    setProfileData(formData);
    setShowEditModal(false);
    setShowSuccessModal(true);
    animateInfoSection();
  } catch (error: any) {
    console.error('Erro ao salvar no banco:', error);
    Alert.alert("Erro ao salvar", error.message || "Não foi possível sincronizar os dados.");
  } finally {
    setIsSaving(false);
  }
};

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userProfile');
      await supabase.auth.signOut();
      // O listener onAuthStateChange no App.tsx irá atualizar o estado e exibir a tela de login
    } catch (error: any) {
      console.error('Erro ao sair:', error.message);
    }
  };

  const callingOptions: Array<'Apóstolo' | 'Profeta' | 'Evangelista' | 'Pastor' | 'Mestre'> = ['Apóstolo', 'Profeta', 'Evangelista', 'Pastor', 'Mestre'];
  const volunteerOptions = ['midia', 'som', 'backstage', 'mesa', 'limpeza', 'louvor', 'consolidação', 'kids', 'adolescentes', 'pré adolescentes', 'jovens', 'estacionamento', 'outros'];
  const unlockedAchievements = mockAchievements.filter((a) => a.unlockedAt);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Animated.View style={[styles.container, { opacity: Platform.OS === 'web' ? (isVisible ? 1 : 0) : fadeAnim }]}>
        
        {/* HEADER */}
        <Gradient colors={[COLORS.gradientStart, COLORS.gradientMiddle]} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.editButton} onPress={() => { setFormData(profileData); setShowEditModal(true); }} activeOpacity={0.85}>
              <Edit size={18} color="#fff" strokeWidth={2} />
              <Text style={styles.editButtonText}>Editar perfil</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {profileData.photoUri ? (
                <Image source={{ uri: profileData.photoUri }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <User size={48} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
              )}
            </View>
          </View>

          <Text style={styles.userName}>{profileData.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{(profileData.role || 'jovem').toUpperCase()}</Text>
          </View>
          <Text style={styles.userEmail}>{profileData.email}</Text>
          <View style={styles.levelBadge}>
            <Award size={18} color={COLORS.accent} strokeWidth={2} />
            <Text style={styles.levelText}>Nível {level}</Text>
          </View>
        </Gradient>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: Platform.OS === 'web' ? (isVisible ? 1 : 0) : infoFadeAnim }}>
            <Gradient colors={[COLORS.secondary, `${COLORS.secondary}CC`]} style={styles.profileInfoCard}>
              <Text style={styles.profileInfoTitle}>Informações do perfil</Text>
              <InfoRow icon={<Church size={20} color="rgba(255,255,255,0.95)" />} label="Igreja" value={profileData.church} />
              <InfoRow icon={<Briefcase size={20} color="rgba(255,255,255,0.95)" />} label="Chamado" value={profileData.calling} />
              <InfoRow icon={<UsersIcon size={20} color="rgba(255,255,255,0.95)" />} label="Voluntário" value={profileData.volunteer?.length ? profileData.volunteer.join(', ') : ''} />
              {(!profileData.church && !profileData.calling && (!profileData.volunteer || profileData.volunteer.length === 0)) && (
                <TouchableOpacity style={styles.emptyProfileHint} onPress={() => { setFormData(profileData); setShowEditModal(true); }} activeOpacity={0.8}>
                  <Text style={styles.emptyProfileHintText}>Toque para preencher suas informações</Text>
                </TouchableOpacity>
              )}
            </Gradient>
          </Animated.View>

          {isAdmin && (
            <TouchableOpacity
              style={styles.adminPanelButton}
              onPress={() => (navigation as any).navigate('AdminTabs')}
            >
              <Shield size={22} color="#fff" />
              <Text style={styles.adminPanelButtonText}>Painel de Admin</Text>
            </TouchableOpacity>
          )}

          <View style={styles.statsGrid}>
            <StatCard value={0} label="Sequência" />
            <StatCard value={attendanceDays} label="Eventos" />
            <StatCard value={unlockedAchievements.length} label="Conquistas" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Crescimento Espiritual</Text>
            <ProgressCard
              title="Nível de Crescimento"
              progress={spiritualProgress}
              color={COLORS.primary}
              subtitle={`${spiritualProgress}% - Continue crescendo!`}
            />
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color={COLORS.error} />
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* MODAL EDITAR */}
        <Modal visible={showEditModal} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Editar perfil</Text>
                  <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} onPress={() => setShowEditModal(false)} style={styles.modalCloseBtn}>
                    <X size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  
                  {/* FOTO */}
                  <TouchableOpacity style={styles.photoSection} onPress={handlePickImage} disabled={isUploading} activeOpacity={0.8}>
                    <View style={styles.photoRing}>
                      <View style={styles.photoContainer}>
                        {formData.photoUri ? (
                          <Image source={{ uri: formData.photoUri }} style={styles.photoPreview} contentFit="cover" />
                        ) : (
                          <View style={styles.photoPlaceholder}>
                            <Camera size={36} color={COLORS.primary} strokeWidth={1.5} />
                            <Text style={styles.photoPlaceholderText}>Adicionar foto</Text>
                          </View>
                        )}
                        {isUploading && (
                          <View style={styles.photoOverlay}>
                            <ActivityIndicator color="#fff" size="large" />
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.photoActionText}>{isUploading ? 'Enviando...' : 'Toque para trocar a foto'}</Text>
                  </TouchableOpacity>

                  {/* DADOS PESSOAIS */}
                  <View style={styles.editCard}>
                    <Text style={styles.editCardTitle}>Dados pessoais</Text>
                    <InputGroup label="Nome *" value={formData.name} onChange={(t: string) => setFormData({ ...formData, name: t })} placeholder="Seu nome" />
                  </View>

                  {/* IGREJA */}
                  <View style={styles.editCard}>
                    <Text style={styles.editCardTitle}>Igreja</Text>
                    <View style={styles.formSection}>
                      <Text style={styles.inputLabel}>Nome da igreja</Text>
                      <View style={styles.churchRow}>
                        <TextInput
                          style={styles.inputChurch}
                          value={formData.church}
                          onChangeText={(t) => setFormData({ ...formData, church: t })}
                          placeholder="Ex.: Igreja Batista Central"
                          placeholderTextColor={COLORS.textSecondary}
                        />
                        <TouchableOpacity
                          style={[styles.convivaButton, formData.church === 'Conviva' && styles.convivaButtonActive]}
                          onPress={() => setFormData({ ...formData, church: formData.church === 'Conviva' ? '' : 'Conviva' })}
                        >
                          <Text style={[styles.convivaButtonText, formData.church === 'Conviva' && styles.convivaButtonTextActive]}>Conviva</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* CHAMADO */}
                  <View style={styles.editCard}>
                    <Text style={styles.editCardTitle}>Chamado</Text>
                    <Text style={styles.editCardSubtitle}>Selecione o ministério que melhor te identifica</Text>
                    <View style={styles.chipRow}>
                      {callingOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.chip, formData.calling === opt && styles.chipActive]}
                          onPress={() => setFormData({ ...formData, calling: opt })}
                        >
                          <Text style={[styles.chipText, formData.calling === opt && styles.chipTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* VOLUNTÁRIO */}
                  <View style={styles.editCard}>
                    <Text style={styles.editCardTitle}>Voluntário em</Text>
                    <Text style={styles.editCardSubtitle}>Áreas em que você atua (pode marcar várias)</Text>
                    <View style={styles.chipRow}>
                      {volunteerOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={[styles.chip, (formData.volunteer || []).includes(opt) && styles.chipActive]}
                          onPress={() => handleVolunteerToggle(opt)}
                        >
                          <Text style={[styles.chipText, (formData.volunteer || []).includes(opt) && styles.chipTextActive]}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {showVolunteerOtherInput && (
                      <View style={styles.volunteerOtherRow}>
                        <TextInput
                          style={styles.inputOther}
                          placeholder="Outra área?"
                          placeholderTextColor={COLORS.textSecondary}
                          value={volunteerOtherText}
                          onChangeText={setVolunteerOtherText}
                        />
                        <TouchableOpacity style={styles.addOtherButton} onPress={handleVolunteerOtherSubmit}>
                          <Text style={styles.addOtherButtonText}>Adicionar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEditModal(false)}>
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveButton, (!formData.name.trim() || isSaving) && styles.saveButtonDisabled]}
                      onPress={handleSaveProfile}
                      disabled={isSaving || !formData.name.trim()}
                    >
                      {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Salvar alterações</Text>}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* MODAL DE SUCESSO */}
        <Modal visible={showSuccessModal} transparent animationType="fade">
          <View style={styles.successBackdrop}>
            <View style={styles.successContainer}>
              <View style={styles.successIconWrap}>
                <CheckCircle size={56} color={COLORS.success} strokeWidth={2} />
              </View>
              <Text style={styles.successTitle}>Perfil atualizado!</Text>
              <Text style={styles.successSubtitle}>Suas informações foram salvas.</Text>
              <TouchableOpacity style={styles.successButton} onPress={() => setShowSuccessModal(false)} activeOpacity={0.85}>
                <Text style={styles.successButtonText}>Ok</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </Animated.View>
    </SafeAreaView>
  );
}

// Sub-componentes
const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) => (
  <View style={styles.profileInfoRow}>
    {icon}
    <View style={styles.profileInfoTextContainer}>
      <Text style={styles.profileInfoLabel}>{label}</Text>
      <Text style={[styles.profileInfoValue, !value && styles.profileInfoValueEmpty]}>
        {value || 'Não preenchido'}
      </Text>
    </View>
  </View>
);

const StatCard = ({ value, label }: any) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const InputGroup = ({ label, value, onChange, placeholder, ...props }: any) => (
  <View style={styles.formSection}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={COLORS.textSecondary} {...props} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingVertical: SPACING.XL, paddingHorizontal: SPACING.LG, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTop: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end', marginBottom: SPACING.MD },
  editButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22 },
  editButtonText: { color: '#fff', marginLeft: 6, fontSize: 13, fontWeight: '600' },
  avatarContainer: { marginBottom: SPACING.MD },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarImage: { width: '100%', height: '100%' },
  userName: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4 },
  userEmail: { fontSize: 14, color: 'rgba(255,255,255,0.88)', marginBottom: SPACING.MD },
  roleBadge: { backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginBottom: 8 },
  roleText: { color: COLORS.secondary, fontSize: 10, fontWeight: '800' },
  levelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22 },
  levelText: { color: COLORS.accent, marginLeft: 6, fontWeight: '700' },
  scrollContent: { padding: SPACING.LG },
  profileInfoCard: { padding: SPACING.LG, borderRadius: BORDER_RADIUS.LG, marginBottom: SPACING.LG, ...SHADOWS.medium },
  profileInfoTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: SPACING.MD },
  profileInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.MD },
  profileInfoTextContainer: { marginLeft: SPACING.MD, flex: 1 },
  profileInfoLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  profileInfoValue: { color: '#fff', fontSize: 16, fontWeight: '500' },
  profileInfoValueEmpty: { color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' },
  emptyProfileHint: { marginTop: 4, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 12, borderStyle: 'dashed' },
  emptyProfileHintText: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.LG },
  statCard: { backgroundColor: COLORS.surface, width: '30%', padding: SPACING.MD, borderRadius: BORDER_RADIUS.MD, alignItems: 'center', ...SHADOWS.small },
  statValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary },
  section: { marginBottom: SPACING.XL },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.MD },
  adminPanelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.primary, padding: SPACING.MD, borderRadius: BORDER_RADIUS.MD, marginBottom: SPACING.LG, ...SHADOWS.small },
  adminPanelButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING.MD, borderRadius: BORDER_RADIUS.MD, marginTop: SPACING.LG, borderWidth: 1, borderColor: COLORS.error },
  logoutText: { color: COLORS.error, fontWeight: 'bold', marginLeft: SPACING.SM },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '92%', overflow: 'hidden' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: SPACING.SM },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.LG, paddingVertical: SPACING.MD, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  modalCloseBtn: { padding: SPACING.XS },
  modalScrollView: { flex: 1 },
  modalScrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL + 24 },
  photoSection: { alignItems: 'center', marginBottom: SPACING.XL },
  photoRing: { padding: 4, borderRadius: 999, backgroundColor: COLORS.primary + '20', marginBottom: SPACING.SM },
  photoContainer: { width: 112, height: 112, borderRadius: 56, overflow: 'hidden', backgroundColor: COLORS.surface },
  photoPreview: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.border },
  photoPlaceholderText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginTop: 6 },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  photoActionText: { ...TYPOGRAPHY.caption, color: COLORS.primary, fontWeight: '600' },
  editCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.LG, padding: SPACING.LG, marginBottom: SPACING.LG, ...SHADOWS.small },
  editCardTitle: { ...TYPOGRAPHY.h3, fontSize: 17, marginBottom: 4 },
  editCardSubtitle: { ...TYPOGRAPHY.caption, marginBottom: SPACING.MD },
  formSection: { marginBottom: SPACING.MD },
  inputLabel: { ...TYPOGRAPHY.caption, color: COLORS.text, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.MD, padding: SPACING.MD, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, fontSize: 16 },
  churchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  inputChurch: { flex: 1, backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.MD, padding: SPACING.MD, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, fontSize: 16 },
  convivaButton: { paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'center', borderRadius: BORDER_RADIUS.MD, borderWidth: 1.5, borderColor: COLORS.primary },
  convivaButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  convivaButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  convivaButtonTextActive: { color: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary + '18', borderColor: COLORS.primary },
  chipText: { ...TYPOGRAPHY.caption, color: COLORS.text },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },
  volunteerOtherRow: { flexDirection: 'row', gap: 10, marginTop: SPACING.MD },
  inputOther: { flex: 1, backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.MD, padding: SPACING.MD, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, fontSize: 15 },
  addOtherButton: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.MD, justifyContent: 'center', borderRadius: BORDER_RADIUS.MD },
  addOtherButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: SPACING.LG },
  cancelButton: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: BORDER_RADIUS.MD, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  cancelButtonText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 16 },
  saveButton: { flex: 2, paddingVertical: 16, alignItems: 'center', borderRadius: BORDER_RADIUS.MD, backgroundColor: COLORS.primary },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  successBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  successContainer: { backgroundColor: COLORS.surface, padding: SPACING.XL, borderRadius: 24, alignItems: 'center', width: '84%', maxWidth: 340 },
  successIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.success + '18', justifyContent: 'center', alignItems: 'center' },
  successTitle: { ...TYPOGRAPHY.h2, color: COLORS.text, marginTop: SPACING.LG },
  successSubtitle: { ...TYPOGRAPHY.bodySmall, marginTop: 6 },
  successButton: { marginTop: SPACING.XL, backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: BORDER_RADIUS.MD },
  successButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});