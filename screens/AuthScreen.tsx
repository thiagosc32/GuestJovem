import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Platform, StatusBar, ActivityIndicator, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react-native';
import { signIn, signUp } from '../services/supabase';
import Gradient from '../components/ui/Gradient';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS } from '../constants/dimensions';
import { TYPOGRAPHY, globalStyles, SHADOWS } from '../constants/theme';

interface AuthScreenProps {
  onAuthenticate: (role: 'admin' | 'user') => void;
}

export default function AuthScreen({ onAuthenticate }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (isSignUp && !name.trim()) {
      setError('Por favor, informe seu nome');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await signUp(email.trim(), password, name.trim());
        setError('Conta criada! Verifique seu email para confirmar.');
        setTimeout(() => {
          setIsSignUp(false);
          setError('');
        }, 3000);
      } else {
        const { user } = await signIn(email.trim(), password);
        if (user) {
          const role = email.includes('admin') ? 'admin' : 'user';
          onAuthenticate(role);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.message.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos');
      } else if (err.message.includes('User already registered')) {
        setError('Este email já está cadastrado');
      } else {
        setError(err.message || 'Erro ao autenticar. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const ContentWrapper = Platform.OS === 'web' ? View : Animated.View;
  const containerStyle = Platform.OS === 'web'
    ? [styles.container, isVisible && styles.visible]
    : [styles.container, { opacity: fadeAnim }];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ContentWrapper style={containerStyle}>
              <Gradient
                colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
              >
                <Text style={styles.appName}>Youth Ministry</Text>
                <Text style={styles.tagline}>Conectando jovens na fé</Text>
              </Gradient>

              <View style={styles.formContainer}>
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    style={[styles.tab, !isSignUp && styles.tabActive]}
                    onPress={() => {
                      setIsSignUp(false);
                      setError('');
                    }}
                    disabled={isLoading}
                  >
                    <LogIn size={20} color={!isSignUp ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>Entrar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tab, isSignUp && styles.tabActive]}
                    onPress={() => {
                      setIsSignUp(true);
                      setError('');
                    }}
                    disabled={isLoading}
                  >
                    <UserPlus size={20} color={isSignUp ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>Cadastrar</Text>
                  </TouchableOpacity>
                </View>

                {error !== '' && (
                  <View style={[styles.errorContainer, error.includes('criada') && styles.successContainer]}>
                    <AlertCircle size={20} color={error.includes('criada') ? COLORS.success : COLORS.error} />
                    <Text style={[styles.errorText, error.includes('criada') && styles.successText]}>{error}</Text>
                  </View>
                )}

                {isSignUp && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Nome Completo</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Seu nome"
                      placeholderTextColor={COLORS.textSecondary}
                      value={name}
                      onChangeText={setName}
                      editable={!isLoading}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="seu.email@exemplo.com"
                    placeholderTextColor={COLORS.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Senha</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!isLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleAuth}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{isSignUp ? 'Criar Conta' : 'Entrar'}</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.demoContainer}>
                  <Text style={styles.demoTitle}>Contas de Demonstração:</Text>
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => {
                      setEmail('admin@conviva.com');
                      setPassword('admin123');
                      setIsSignUp(false);
                    }}
                    disabled={isLoading}
                  >
                    <Text style={styles.demoButtonText}>Admin: admin@conviva.com / admin123</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.demoButton}
                    onPress={() => {
                      setEmail('user@conviva.com');
                      setPassword('user123');
                      setIsSignUp(false);
                    }}
                    disabled={isLoading}
                  >
                    <Text style={styles.demoButtonText}>Usuário: user@conviva.com / user123</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ContentWrapper>
          </ScrollView>
        </KeyboardAvoidingView>
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
    paddingVertical: SPACING.XXL * 2,
    alignItems: 'center',
  },
  appName: {
    ...TYPOGRAPHY.h1,
    color: '#fff',
    marginBottom: SPACING.SM,
  },
  tagline: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  formContainer: {
    padding: SPACING.LG,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.XS,
    marginBottom: SPACING.LG,
    ...SHADOWS.small,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
    gap: SPACING.XS,
  },
  tabActive: {
    backgroundColor: COLORS.background,
  },
  tabText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.error}20`,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  successContainer: {
    backgroundColor: `${COLORS.success}20`,
  },
  errorText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.error,
    flex: 1,
  },
  successText: {
    color: COLORS.success,
  },
  inputContainer: {
    marginBottom: SPACING.MD,
  },
  label: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginBottom: SPACING.SM,
  },
  input: {
    ...globalStyles.input,
  },
  button: {
    ...globalStyles.button,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.MD,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...globalStyles.buttonText,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.LG,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.MD,
  },
  demoContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    ...SHADOWS.small,
  },
  demoTitle: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    marginBottom: SPACING.SM,
  },
  demoButton: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.SM,
    marginTop: SPACING.SM,
  },
  demoButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
  },
});