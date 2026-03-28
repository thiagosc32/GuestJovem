import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, Eye, EyeOff, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { supabase, getCurrentUser } from '../services/supabase';
import { mapAppRole } from './AuthScreen';
import { COLORS } from '../constants/colors';

const MIN_LEN = 6;

type Props = {
  onComplete: (role: 'admin' | 'user') => void;
  onCancel?: () => void;
};

/**
 * Após clicar no link "esqueci a senha" (type=recovery): definir nova senha com confirmação.
 * Não confundir com login Google — sessão é só de recuperação até updateUser({ password }).
 */
export default function UpdatePasswordScreen({ onComplete, onCancel }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!password.trim() || !confirm.trim()) {
      setError('Preencha os dois campos.');
      return;
    }
    if (password.length < MIN_LEN) {
      setError(`A senha deve ter no mínimo ${MIN_LEN} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      const profile = await getCurrentUser();
      onComplete(mapAppRole(profile as { role?: string } | null));
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientMiddle]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Lock size={40} color="#fff" strokeWidth={1.5} />
            </View>
            <Text style={styles.title}>Nova senha</Text>
            <Text style={styles.subtitle}>
              Digite sua nova senha duas vezes para confirmar. Depois você entrará no app automaticamente.
            </Text>
          </View>

          <View style={styles.card}>
            <BlurView intensity={Platform.OS === 'ios' ? 40 : 80} tint="light" style={StyleSheet.absoluteFillObject} />
            <View style={styles.inner}>
              {error !== '' && (
                <View style={styles.banner}>
                  <AlertCircle size={18} color="#fff" />
                  <Text style={styles.bannerText}>{error}</Text>
                </View>
              )}

              <Text style={styles.label}>Nova senha</Text>
              <View style={styles.pwWrap}>
                <TextInput
                  style={styles.pwInput}
                  placeholder="Nova senha"
                  placeholderTextColor="#888"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!show1}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShow1((v) => !v)} style={styles.eye}>
                  {show1 ? <EyeOff size={22} color="#555" /> : <Eye size={22} color="#555" />}
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>Confirmar nova senha</Text>
              <View style={styles.pwWrap}>
                <TextInput
                  style={styles.pwInput}
                  placeholder="Repita a senha"
                  placeholderTextColor="#888"
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry={!show2}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShow2((v) => !v)} style={styles.eye}>
                  {show2 ? <EyeOff size={22} color="#555" /> : <Eye size={22} color="#555" />}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btnGrad}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Salvar senha e entrar</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {onCancel ? (
                <TouchableOpacity style={styles.cancel} onPress={onCancel} disabled={loading}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gradientStart },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 40, paddingHorizontal: 20 },
  header: { alignItems: 'center', marginTop: 32, marginBottom: 24 },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 340,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  inner: { padding: 20 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(211, 47, 47, 0.55)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bannerText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600', color: '#f1f5f9', marginBottom: 8 },
  pwWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
  },
  pwInput: { flex: 1, fontSize: 16, color: '#111827', paddingHorizontal: 8 },
  eye: { padding: 8 },
  btn: { marginTop: 24, borderRadius: 18, overflow: 'hidden' },
  btnDisabled: { opacity: 0.7 },
  btnGrad: { height: 54, justifyContent: 'center', alignItems: 'center', borderRadius: 17 },
  btnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  cancel: { marginTop: 16, alignSelf: 'center', padding: 8 },
  cancelText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
});
