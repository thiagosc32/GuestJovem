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
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Phone, Calendar, Award, LogOut, Edit, Camera, CheckCircle, X, Church, Briefcase, Users as UsersIcon, Shield, Trophy, ChevronRight, QrCode, FileText, Flame, BookOpen, BookMarked, PenLine, MessageCircle, ListChecks } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';

import { supabase, signOut } from '../../services/supabase';
import { getJourneySummary } from '../../services/spiritualJourney';
import { getUnlockedAchievements } from '../../services/achievementsService';
import Gradient from '../../components/ui/Gradient';
import ProgressCard from '../../components/ProgressCard';
import LevelDisclaimer from '../../components/LevelDisclaimer';
import { COLORS } from '../../constants/colors';
import { useAppTheme } from '../../contexts/ChurchBrandingContext';
import { SPIRITUAL_LEVELS, LEVEL_DISCLAIMER_MESSAGE } from '../../constants/spiritualJourney';
import { isFeatureAvailableForLevel, getLockedFeatureAlert, LEVEL_NAMES } from '../../constants/featureGates';
import { SPACING, BORDER_RADIUS } from '../../constants/dimensions';
import { SHADOWS, TYPOGRAPHY } from '../../constants/theme';
import { UserProfile } from '../../types/models';
import { getUserQRPayload } from '../../constants/userQR';

let QRCodeComponent: React.ComponentType<{ value: string; size: number; backgroundColor?: string; color?: string }> | null = null;
try {
  QRCodeComponent = require('react-native-qrcode-svg').default;
} catch (_) {}

// Helper para decode sem biblioteca externa
const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/** Supabase Storage rejeita `image/jpg`; na web o URI é muitas vezes `blob:…` sem extensão. */
function getAvatarUploadMimeType(uri: string, pickerMime?: string | null): string {
  const raw = pickerMime?.trim().toLowerCase();
  if (raw?.startsWith('image/')) {
    return raw === 'image/jpg' ? 'image/jpeg' : raw;
  }
  const path = uri.split('?')[0].split('#')[0];
  const ext = path.includes('.') && !path.startsWith('blob:') ? path.split('.').pop()?.toLowerCase() : '';
  const byExt: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  if (ext && byExt[ext]) return byExt[ext];
  return 'image/jpeg';
}

function fileExtensionForImageMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/heic' || mime === 'image/heif') return 'heic';
  return 'jpg';
}
const getRoleDetails = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'admin': return { color: '#EF4444', label: 'Admin' };
    case 'staff': return { color: '#F59E0B', label: 'Staff' };
    case 'volunteer': return { color: '#10B981', label: 'Voluntário' };
    default: return { color: COLORS.accent, label: 'Jovem' };
  }
};
export default function ProfileScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const infoFadeAnim = useRef(new Animated.Value(0)).current;

  const [isVisible, setIsVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [attendanceDays, setAttendanceDays] = useState(0);
  const [levelName, setLevelName] = useState('Ouvir');
  const [levelNumber, setLevelNumber] = useState(1);
  const [spiritualProgress, setSpiritualProgress] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLevelsModal, setShowLevelsModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // RECOLOCADO: Estados do Voluntariado
  const [showVolunteerOtherInput, setShowVolunteerOtherInput] = useState(false);
  const [volunteerOtherText, setVolunteerOtherText] = useState('');

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<Array<{ id: string; title: string; icon: string }>>([]);
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

  const runLoadProfile = React.useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        await new Promise((r) => setTimeout(r, 200));
        ({ data: { session } } = await supabase.auth.getSession());
      }
      const userId = session?.user?.id;
      if (!userId) {
        setProfileLoading(false);
        return;
      }
      setCurrentUserId(userId);
      const userEmail = session.user.email ?? '';

      const cached = await AsyncStorage.getItem('userProfile');
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as UserProfile & { email?: string };
          if (parsed?.email && parsed.email === userEmail) {
            setProfileData(parsed);
            setFormData(parsed);
          }
        } catch (_) {}
      }

      await carregarPerfil(userId, userEmail);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar perfil';
      setProfileError(msg);
    } finally {
      setProfileLoading(false);
      infoFadeAnim.setValue(0);
      Animated.timing(infoFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, []);

  useFocusEffect(React.useCallback(() => { runLoadProfile(); }, [runLoadProfile]));

  async function carregarPerfil(userId: string, userEmail: string) {
    try {
      const userRes = await supabase.from('users').select('*').eq('id', userId).single();
      const userRow = userRes.data;
      const tenantCid =
        userRow && (userRow as { role?: string }).role !== 'super_admin'
          ? (userRow as { church_id?: string | null }).church_id ?? null
          : null;
      let attQ = supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      if (tenantCid) attQ = attQ.eq('church_id', tenantCid);
      const [attendanceRes, journey, youthRes] = await Promise.all([
        attQ,
        getJourneySummary(userId),
        supabase.from('youth_profiles').select('church, calling, volunteer').eq('user_id', userId).limit(1).maybeSingle(),
      ]);
      const userError = userRes.error;
      if (userError) throw userError;

      setAttendanceDays(attendanceRes.count ?? 0);

      try {
        if (journey) {
          setLevelNumber(journey.level);
          setLevelName(journey.levelName);
          setSpiritualProgress(Math.round(journey.progressPercent));
        } else {
          setLevelNumber(1);
          setLevelName('Ouvir');
          setSpiritualProgress(0);
        }
      } catch (_) {
        setLevelNumber(1);
        setLevelName('Ouvir');
        setSpiritualProgress(0);
      }

      const youth = youthRes.data as { church?: string; calling?: string; volunteer?: string[] } | null;

      if (!userRow) {
        const fallback: UserProfile = {
          name: 'Usuário',
          email: userEmail,
          phone: '',
          bio: '',
          photoUri: '',
          church: youth?.church ?? '',
          calling: (youth?.calling as UserProfile['calling']) ?? undefined,
          volunteer: youth?.volunteer ?? [],
          role: 'jovem',
        };
        setProfileData(fallback);
        setFormData(fallback);
        await AsyncStorage.setItem('userProfile', JSON.stringify(fallback));
        return;
      }

      const d = userRow as Record<string, unknown>;
      const church = (d.church != null && d.church !== '') ? String(d.church) : (youth?.church ?? '');
      const calling = (d.calling != null && d.calling !== '') ? (d.calling as UserProfile['calling']) : (youth?.calling as UserProfile['calling'] ?? undefined);
      const volunteer = (Array.isArray(d.volunteer) && (d.volunteer as string[]).length > 0) ? (d.volunteer as string[]) : (youth?.volunteer ?? []);

      const updatedProfile: UserProfile = {
        name: (d.name && String(d.name)) || 'Usuário',
        email: (d.email && String(d.email)) || userEmail,
        phone: (d.phone && String(d.phone)) || '',
        bio: '',
        photoUri: (d.avatar_url && String(d.avatar_url)) || '',
        church,
        calling: calling || undefined,
        volunteer,
        role: ((d.role as UserProfile['role']) || 'jovem'),
      };

      setIsAdmin(d.role === 'admin');
      setProfileData(updatedProfile);
      setFormData(updatedProfile);
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));

      const level = journey?.level ?? 1;
      if (isFeatureAvailableForLevel('badges', level)) {
        getUnlockedAchievements(userId)
          .then((badges) => setUnlockedBadges(badges.map((b) => ({ id: b.id, title: b.definition.title, icon: b.definition.icon }))))
          .catch(() => setUnlockedBadges([]));
      } else {
        setUnlockedBadges([]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar perfil';
      setProfileError(message);
      const fallback: UserProfile = {
        name: 'Usuário',
        email: userEmail,
        phone: '',
        bio: '',
        photoUri: '',
        church: '',
        calling: undefined,
        volunteer: [],
        role: 'jovem',
      };
      setProfileData(fallback);
      setFormData(fallback);
    }
  }

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
      uploadImage(asset.uri, base64String, asset.mimeType);
    }
  };

  const uploadImage = async (uri: string, base64: string, pickerMime?: string | null) => {
    try {
      setIsUploading(true);
      const contentType = getAvatarUploadMimeType(uri, pickerMime);
      const fileExt = fileExtensionForImageMime(contentType);
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      const arrayBuffer = decodeBase64(base64);

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, { contentType, upsert: true });

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
    }
    const { data: existingYouth } = await supabase.from('youth_profiles').select('id').eq('user_id', user.id).limit(1).maybeSingle();
    if (existingYouth) {
      await supabase.from('youth_profiles').update(youthPayload).eq('user_id', user.id);
    } else {
      await supabase.from('youth_profiles').insert({ user_id: user.id, baptized: false, ...youthPayload });
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
      await signOut();
      // O listener onAuthStateChange no App.tsx irá atualizar o estado e exibir a tela de login
    } catch (error: any) {
      console.error('Erro ao sair:', error.message);
    }
  };

  const callingOptions: Array<'Apóstolo' | 'Profeta' | 'Evangelista' | 'Pastor' | 'Mestre'> = ['Apóstolo', 'Profeta', 'Evangelista', 'Pastor', 'Mestre'];
  const volunteerOptions = ['midia', 'som', 'backstage', 'mesa', 'limpeza', 'louvor', 'consolidação', 'kids', 'adolescentes', 'pré adolescentes', 'jovens', 'estacionamento', 'outros'];

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingLabel}>Carregando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (profileError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Erro ao carregar perfil</Text>
          <Text style={styles.errorMessage}>{profileError}</Text>
          <TouchableOpacity
            style={styles.errorRetryBtn}
            onPress={runLoadProfile}
            activeOpacity={0.8}
          >
            <Text style={styles.errorRetryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!profileData?.email) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>Nenhum perfil encontrado</Text>
          <Text style={styles.errorMessage}>Faça login novamente ou tente mais tarde.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.container, { opacity: Platform.OS === 'web' ? (isVisible ? 1 : 0) : fadeAnim }]}>
        {/* Hero com gradiente e avatar */}
        <View style={styles.hero}>
          <Gradient colors={[theme.gradientStart, theme.gradientMiddle, theme.secondary]} style={styles.heroGradient} />
          <View style={styles.heroContent}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarOuter}>
                <View style={styles.avatar}>
                  {profileData.photoUri ? (
                    <Image source={{ uri: profileData.photoUri }} style={styles.avatarImage} contentFit="cover" />
                  ) : (
                    <User size={36} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
                  )}
                </View>
              </View>
            </View>
            <Text style={styles.heroName}>{profileData.name || 'Usuário'}</Text>
            <Text style={styles.heroEmail} numberOfLines={1}>{profileData.email}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{(profileData.role || 'jovem').toUpperCase()}</Text>
            </View>
            <TouchableOpacity style={styles.editProfileButton} onPress={() => { setFormData(profileData); setShowEditModal(true); }} activeOpacity={0.9}>
              <Edit size={18} color="#fff" strokeWidth={2} />
              <Text style={styles.editProfileButtonText}>Editar perfil</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card de estatísticas sobre o hero */}
        <View style={styles.statsWrap}>
          <TouchableOpacity style={styles.statsCard} onPress={() => setShowLevelsModal(true)} activeOpacity={0.8}>
            <View style={styles.statItem}>
              <View style={[styles.statIconWrap, { backgroundColor: '#E6F7ED' }]}>
                <Trophy size={12} color={COLORS.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statNumber} numberOfLines={1}>Nível {levelNumber}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>{levelName}</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: Platform.OS === 'web' ? (isVisible ? 1 : 0) : infoFadeAnim }}>
            {/* Conquistas */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.conquistasHeader}
                onPress={() => {
                  if (!isFeatureAvailableForLevel('badges', levelNumber)) {
                    const locked = getLockedFeatureAlert('badges', levelNumber);
                    const nivelRequerido = LEVEL_NAMES[3] ?? 'Permanecer';
                    const msgBase = locked?.message ?? `As conquistas são liberadas a partir do nível 3 (${nivelRequerido}).`;
                    Alert.alert(
                      'Conquistas em breve',
                      msgBase + '\n\n' +
                      'Continue firme na jornada: devocionais, oração, eventos e reflexões te levam ao próximo nível. ' +
                      `Quando você chegar ao nível 3 (${nivelRequerido}), as conquistas serão liberadas e você poderá ver e desbloquear cada uma. Não desanime — cada passo conta! 🏆`,
                      [{ text: 'Entendi', style: 'default' }]
                    );
                    return;
                  }
                  (navigation as any).navigate('MainTabs', { screen: 'BadgesScreen' });
                }}
                activeOpacity={0.8}
              >
                <Award size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Minhas conquistas</Text>
                <ChevronRight size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <View style={styles.badgesRow}>
                {!isFeatureAvailableForLevel('badges', levelNumber) ? (
                  <Text style={styles.badgesLocked}>
                    Conquistas disponíveis a partir do nível 3 (Permanecer). Toque em "Minhas conquistas" acima para saber como liberar.
                  </Text>
                ) : unlockedBadges.length === 0 ? (
                  <Text style={styles.badgesEmpty}>Nenhuma conquista desbloqueada ainda. Continue na jornada!</Text>
                ) : (
                  unlockedBadges.slice(0, 8).map((b) => {
                    const IconMap: Record<string, React.ComponentType<{ color: string; size: number }>> = {
                      flame: Flame, book: BookOpen, 'book-open': BookMarked, dove: Award, calendar: Calendar, 'pen-line': PenLine, 'message-circle': MessageCircle, 'list-checks': ListChecks,
                    };
                    const IconComp = IconMap[b.icon] ?? Award;
                    return (
                      <View key={b.id} style={styles.badgePill}>
                        <IconComp size={22} color={COLORS.success} />
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Sobre você</Text>
              <View style={styles.infoCard}>
                <InfoRow icon={<Church size={20} color={COLORS.primary} />} label="Igreja" value={profileData.church} />
                <View style={styles.infoDivider} />
                <InfoRow icon={<Briefcase size={20} color={COLORS.secondary} />} label="Chamado" value={profileData.calling} />
                <View style={styles.infoDivider} />
                <InfoRow icon={<UsersIcon size={20} color={COLORS.spiritualOrange} />} label="Voluntário" value={profileData.volunteer?.length ? profileData.volunteer.join(', ') : ''} />
                {(!profileData.church && !profileData.calling && (!profileData.volunteer || profileData.volunteer.length === 0)) && (
                  <>
                    <View style={styles.infoDivider} />
                    <TouchableOpacity style={styles.emptyProfileHint} onPress={() => { setFormData(profileData); setShowEditModal(true); }} activeOpacity={0.8}>
                      <Text style={styles.emptyProfileHintText}>Complete seu perfil</Text>
                      <ChevronRight size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Meu QR Code pessoal - presença em eventos (sempre visível para usuário logado) */}
            <View style={styles.section}>
              <View style={styles.qrSectionHeader}>
                <QrCode size={20} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Meu QR Code</Text>
              </View>
              <View style={styles.qrCard}>
                {currentUserId ? (
                  <>
                    <View style={styles.qrWrap}>
                      {QRCodeComponent ? (
                        <QRCodeComponent value={getUserQRPayload(currentUserId)} size={200} backgroundColor={COLORS.surface} color={COLORS.text} />
                      ) : (
                        <View style={styles.qrPlaceholder}>
                          <QrCode size={80} color={COLORS.textLight} />
                          <Text style={styles.qrPlaceholderText}>Execute: npm install react-native-qrcode-svg</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.qrHint}>Mostre este QR na entrada dos eventos para registrar sua presença.</Text>
                  </>
                ) : (
                  <Text style={styles.qrHint}>Carregando seu código...</Text>
                )}
              </View>
            </View>

            {isAdmin && (
              <TouchableOpacity style={styles.adminPanelButton} onPress={() => (navigation as any).navigate('AdminTabs')} activeOpacity={0.9}>
                <Shield size={22} color="#fff" strokeWidth={2} />
                <Text style={styles.adminPanelButtonText}>Painel de Admin</Text>
              </TouchableOpacity>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Crescimento espiritual</Text>
              <TouchableOpacity onPress={() => setShowLevelsModal(true)} activeOpacity={0.8}>
                <ProgressCard
                  title={`Nível: ${levelName}`}
                  progress={spiritualProgress}
                  color={COLORS.primary}
                  subtitle={spiritualProgress >= 100 ? 'Parabéns! Continue firme.' : `${spiritualProgress}% - Continue crescendo na Jornada!`}
                />
              </TouchableOpacity>
              <Text style={styles.levelsHint}>Toque no card para ver todos os níveis</Text>
              <LevelDisclaimer />
              <TouchableOpacity
                style={styles.termsLink}
                onPress={() => (navigation as any).navigate('SpiritualTerms')}
                activeOpacity={0.8}
              >
                <FileText size={18} color={COLORS.primary} />
                <Text style={styles.termsLinkText}>Termos de uso espiritual</Text>
                <ChevronRight size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
              <LogOut size={20} color={COLORS.error} strokeWidth={2} />
              <Text style={styles.logoutText}>Sair da conta</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* MODAL NÍVEIS */}
        <Modal visible={showLevelsModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={styles.levelsModalContainer}>
              <View style={styles.modalHandle} />
              <View style={styles.levelsModalHeader}>
                <Text style={styles.levelsModalTitle}>Níveis da Jornada</Text>
                <TouchableOpacity onPress={() => setShowLevelsModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <X size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.levelsModalIntro}>{LEVEL_DISCLAIMER_MESSAGE}</Text>
              <ScrollView style={styles.levelsScroll} showsVerticalScrollIndicator={false}>
                {SPIRITUAL_LEVELS.map((lvl) => (
                  <View key={lvl.level} style={[styles.levelItem, levelNumber === lvl.level && styles.levelItemActive]}>
                    <View style={styles.levelItemHeader}>
                      <Text style={styles.levelItemNumber}>Nível {lvl.level}</Text>
                      <Text style={styles.levelItemName}>{lvl.name}</Text>
                    </View>
                    <Text style={styles.levelItemShort}>{lvl.shortDescription}</Text>
                    <Text style={styles.levelItemLong}>{lvl.longDescription}</Text>
                    {lvl.verse && <Text style={styles.levelItemVerse}>— {lvl.verse}</Text>}
                  </View>
                ))}
              </ScrollView>
              <Text style={styles.levelsModalFooter}>
                Seu progresso nunca volta para trás. Foco na constância, não na performance.
              </Text>
            </View>
          </View>
        </Modal>

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

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoRowIcon}>{icon}</View>
    <View style={styles.infoRowText}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={[styles.infoRowValue, !value && styles.infoRowValueEmpty]} numberOfLines={2}>
        {value || 'Não preenchido'}
      </Text>
    </View>
  </View>
);

const InputGroup = ({ label, value, onChange, placeholder, ...props }: any) => (
  <View style={styles.formSection}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={COLORS.textSecondary} {...props} />
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingLabel: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  errorTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, textAlign: 'center' },
  errorMessage: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center' },
  errorRetryBtn: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.MD },
  errorRetryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  container: { flex: 1 },
  hero: { paddingTop: SPACING.SM, paddingBottom: 20, paddingHorizontal: SPACING.LG, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden', position: 'relative' },
  heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: { alignItems: 'center' },
  editProfileButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  editProfileButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  avatarWrap: { marginVertical: SPACING.SM },
  avatarOuter: { padding: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  heroName: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2, textAlign: 'center' },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 6, textAlign: 'center', maxWidth: '100%' },
  rolePill: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  rolePillText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  statsWrap: { marginHorizontal: SPACING.LG, marginTop: -18, marginBottom: SPACING.SM },
  statsCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 10, alignItems: 'center', justifyContent: 'space-around', ...SHADOWS.medium, elevation: 4 },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  statIconWrap: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statNumber: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '500' },
  statDivider: { width: 1, height: 25, backgroundColor: COLORS.border },
  scrollContent: { padding: SPACING.LG, paddingBottom: SPACING.XXL },
  section: { marginBottom: 20 },
  conquistasHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  badgePill: { width: 48, height: 48, borderRadius: 24, backgroundColor: `${COLORS.success}18`, justifyContent: 'center', alignItems: 'center' },
  badgesEmpty: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, fontStyle: 'italic' },
  badgesLocked: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  sectionLink: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  qrSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  qrCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: SPACING.LG, alignItems: 'center', ...SHADOWS.small },
  qrWrap: { padding: 16, backgroundColor: '#fff', borderRadius: 12, minHeight: 232, justifyContent: 'center', alignItems: 'center' },
  qrPlaceholder: { alignItems: 'center', paddingVertical: 24 },
  qrPlaceholderText: { marginTop: 12, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  qrHint: { marginTop: SPACING.MD, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 8 },
  infoCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: SPACING.MD, ...SHADOWS.small },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  infoRowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoRowText: { flex: 1 },
  infoRowLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 2 },
  infoRowValue: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  infoRowValueEmpty: { fontSize: 14, color: COLORS.textLight, fontStyle: 'italic' },
  infoDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 48 },
  emptyProfileHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 4, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, borderStyle: 'dashed', marginLeft: 0 },
  emptyProfileHintText: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
  adminPanelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.primary, padding: 14, borderRadius: 20, marginBottom: SPACING.MD, ...SHADOWS.small },
  adminPanelButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  termsLink: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.SM, paddingHorizontal: SPACING.MD, marginTop: SPACING.SM, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.MD, gap: 10 },
  termsLinkText: { flex: 1, fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 20, marginTop: 4, borderWidth: 1.5, borderColor: COLORS.error, backgroundColor: COLORS.surface },
  logoutText: { color: COLORS.error, fontWeight: '700', marginLeft: 8, fontSize: 16 },
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
  levelsHint: { ...TYPOGRAPHY.caption, color: COLORS.textLight, marginTop: 4, marginBottom: SPACING.SM },
  levelsModalContainer: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  levelsModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.LG, paddingVertical: SPACING.MD, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  levelsModalTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  levelsModalIntro: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, paddingHorizontal: SPACING.LG, paddingTop: SPACING.MD, fontStyle: 'italic' },
  levelsScroll: { maxHeight: 420, paddingHorizontal: SPACING.LG, paddingTop: SPACING.MD },
  levelItem: { marginBottom: SPACING.LG, padding: SPACING.MD, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.MD, borderWidth: 1, borderColor: COLORS.border },
  levelItemActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  levelItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  levelItemNumber: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  levelItemName: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  levelItemShort: { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, marginBottom: 6 },
  levelItemLong: { ...TYPOGRAPHY.bodySmall, color: COLORS.text, lineHeight: 20 },
  levelItemVerse: { fontSize: 12, color: COLORS.primary, fontStyle: 'italic', marginTop: 6 },
  levelsModalFooter: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, paddingHorizontal: SPACING.LG, paddingVertical: SPACING.MD, textAlign: 'center' },
});