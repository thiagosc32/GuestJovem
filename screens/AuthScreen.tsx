import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogIn, UserPlus, AlertCircle, Eye, EyeOff, Flame } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { signIn, signUp, getGoogleSignInUrl, getCurrentUser, resetPassword, setSessionFromOAuthUrl, ensureUserProfileForOAuth } from '../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS } from '../constants/colors';
import { SPACING, BORDER_RADIUS } from '../constants/dimensions';
import { TYPOGRAPHY } from '../constants/theme';

const GLASS_BORDER_COLOR = 'rgba(255, 255, 255, 0.2)';

interface AuthScreenProps {
  onAuthenticate: (role: 'admin' | 'user') => void;
}

export default function AuthScreen({ onAuthenticate }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isVisible, setIsVisible] = useState(false);

  // Animações de entrada (profissional, sequenciadas)
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(24)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(32)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const quickOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

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

  // Web: conteúdo visível logo (sem animação nativa). Mobile: animação de entrada.
  useEffect(() => {
    if (Platform.OS === 'web') {
      logoScale.setValue(1);
      logoOpacity.setValue(1);
      titleTranslateY.setValue(0);
      titleOpacity.setValue(1);
      taglineOpacity.setValue(1);
      cardTranslateY.setValue(0);
      cardOpacity.setValue(1);
      quickOpacity.setValue(1);
      return;
    }
    const duration = 420;
    const delay = 120;
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 60,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: duration * 0.6,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: duration - 80,
        useNativeDriver: true,
      }),
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: duration + 60,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(quickOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const MIN_PASSWORD_LENGTH = 6;

  const handleAuth = async () => {
    const emailTrim = email.trim();
    const emailEmpty = !emailTrim;
    const passwordEmpty = !password.trim();
    const nameEmpty = isSignUp && !name.trim();

    if (emailEmpty || passwordEmpty || nameEmpty) {
      setShowValidationErrors(true);
      setError('Preencha todos os campos obrigatórios.');
      setSuccessMessage('');
      return;
    }
    if (!isValidEmail(emailTrim)) {
      setShowValidationErrors(true);
      setError('Informe um e-mail válido.');
      setSuccessMessage('');
      return;
    }
    if (isSignUp && password.length < MIN_PASSWORD_LENGTH) {
      setShowValidationErrors(true);
      setError(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
      setSuccessMessage('');
      return;
    }

    setShowValidationErrors(false);
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        await signUp(emailTrim, password, name.trim());
        setSuccessMessage('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
        setError('');
        setTimeout(() => {
          setIsSignUp(false);
          setSuccessMessage('');
        }, 4000);
      } else {
        await signIn(emailTrim, password);
        const profile = await getCurrentUser();
        const role = (profile as { role?: 'admin' | 'user' })?.role === 'admin' ? 'admin' : 'user';
        onAuthenticate(role);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setSuccessMessage('');
      if (err.message?.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos.');
      } else if (err.message?.toLowerCase().includes('email not confirmed')) {
        setError('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.');
      } else if (err.message?.includes('User already registered') || err.message?.includes('already registered')) {
        setError('Este e-mail já está cadastrado. Use a opção Entrar.');
      } else {
        setError(err?.message || 'Erro ao autenticar. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailTrim = email.trim();
    if (!emailTrim) {
      setError('Digite seu e-mail para redefinir a senha.');
      setSuccessMessage('');
      return;
    }
    if (!isValidEmail(emailTrim)) {
      setError('Informe um e-mail válido.');
      setSuccessMessage('');
      return;
    }
    setError('');
    setSuccessMessage('');
    setIsResettingPassword(true);
    try {
      await resetPassword(emailTrim);
      setSuccessMessage('Enviamos um link para redefinir sua senha no e-mail informado. Verifique sua caixa de entrada.');
      setError('');
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível enviar o e-mail. Tente novamente.');
      setSuccessMessage('');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const popupCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (popupCheckRef.current) {
        clearInterval(popupCheckRef.current);
        popupCheckRef.current = null;
      }
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      // Web (PWA/atalho): abrir login em popup para o retorno ficar no atalho, não no navegador
      const redirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.origin + '/'
          : Platform.OS !== 'web'
            ? 'guestjovem://google-auth'
            : undefined;
      if (__DEV__ && redirectTo) {
        console.log('[Guest Jovem] Redirect URL. Adicione no Supabase (Auth → URL Configuration → Redirect URLs):', redirectTo);
      }
      const url = await getGoogleSignInUrl(redirectTo);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const origin = window.location.origin;
        const popup = window.open(url, 'oauth_guestjovem', 'width=520,height=700,scrollbars=yes');
        if (!popup) {
          setError('Permita pop-ups para este site e tente novamente.');
          setIsGoogleLoading(false);
          return;
        }
        const onMessage = async (event: MessageEvent) => {
          if (event.origin !== origin || event.data?.type !== 'OAUTH_CALLBACK' || !event.data?.url) return;
          window.removeEventListener('message', onMessage);
          if (popupCheckRef.current) {
            clearInterval(popupCheckRef.current);
            popupCheckRef.current = null;
          }
          try {
            await setSessionFromOAuthUrl(event.data.url);
            await ensureUserProfileForOAuth();
            const user = await getCurrentUser();
            if (user) {
              onAuthenticate((user as { role?: 'admin' | 'user' }).role ?? 'user');
            }
          } catch (e: any) {
            setError(e?.message ?? 'Erro ao concluir login.');
          } finally {
            setIsGoogleLoading(false);
          }
        };
        window.addEventListener('message', onMessage);
        popupCheckRef.current = setInterval(() => {
          if (popup.closed) {
            if (popupCheckRef.current) {
              clearInterval(popupCheckRef.current);
              popupCheckRef.current = null;
            }
            window.removeEventListener('message', onMessage);
            setIsGoogleLoading(false);
          }
        }, 300);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(url, redirectTo ?? undefined);
      if (result.type === 'success' && result.url) {
        await setSessionFromOAuthUrl(result.url);
        await ensureUserProfileForOAuth();
        const user = await getCurrentUser();
        if (user) {
          onAuthenticate((user as { role?: 'admin' | 'user' }).role ?? 'user');
        }
        return;
      }
      if (result.type === 'cancel') return;
      setError('Login com Google cancelado ou falhou.');
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao abrir login com Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const ContentWrapper = Platform.OS === 'web' ? View : Animated.View;
  const containerStyle = Platform.OS === 'web'
    ? [styles.container, isVisible && styles.visible]
    : [styles.container, { opacity: fadeAnim }];

  const primaryButtonLabel = isSignUp
    ? (Platform.OS === 'android' ? 'CRIAR CONTA' : 'Criar conta')
    : (Platform.OS === 'android' ? 'ENTRAR' : 'Entrar');

  const hasEmailError = showValidationErrors && !email.trim();
  const hasPasswordError = showValidationErrors && (!password.trim() || (isSignUp && password.length < MIN_PASSWORD_LENGTH));
  const hasNameError = showValidationErrors && isSignUp && !name.trim();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <View style={[styles.wrapper, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0 }]}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <ContentWrapper style={containerStyle}>
              {/* Header premium — profissional e jovem no degradê vermelho */}
              <View style={styles.header}>
                <Animated.View
                  style={[
                    styles.logoCircle,
                    {
                      opacity: logoOpacity,
                      transform: [{ scale: logoScale }],
                    },
                  ]}
                >
                  <Flame size={48} color="#fff" strokeWidth={1.5} />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.titleBlock,
                    {
                      opacity: titleOpacity,
                      transform: [{ translateY: titleTranslateY }],
                    },
                  ]}
                >
                  <Text style={styles.brandName}>
                    Guest <Text style={styles.brandBold}>JOVEM</Text>
                  </Text>
                </Animated.View>
                <Animated.View style={[styles.taglineWrap, { opacity: taglineOpacity }]}>
                  <Text style={styles.tagline}>Conectando jovens na fé</Text>
                </Animated.View>
              </View>

              {/* Card único do formulário em glassmorphism */}
              <Animated.View
                style={[
                  styles.formCard,
                  {
                    opacity: cardOpacity,
                    transform: [{ translateY: cardTranslateY }],
                  },
                ]}
              >
                <BlurView
                  intensity={Platform.OS === 'ios' ? 40 : 80}
                  tint="light"
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.formInner}>
                  <View style={styles.tabContainer}>
                    <TouchableOpacity
                      style={[styles.tab, !isSignUp && styles.tabActive]}
                      onPress={() => { setIsSignUp(false); setError(''); setSuccessMessage(''); setShowValidationErrors(false); }}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      <LogIn size={18} color={!isSignUp ? COLORS.primary : 'rgba(255,255,255,0.8)'} strokeWidth={2} />
                      <Text style={[styles.tabText, !isSignUp && styles.tabTextActive]}>Entrar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tab, isSignUp && styles.tabActive]}
                      onPress={() => { setIsSignUp(true); setError(''); setSuccessMessage(''); setShowValidationErrors(false); }}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      <UserPlus size={18} color={isSignUp ? COLORS.primary : 'rgba(255,255,255,0.8)'} strokeWidth={2} />
                      <Text style={[styles.tabText, isSignUp && styles.tabTextActive]}>Cadastrar</Text>
                    </TouchableOpacity>
                  </View>

                  {error !== '' && (
                    <View style={[styles.messageBanner, styles.messageError]}>
                      <AlertCircle size={18} color="#fff" />
                      <Text style={[styles.messageText, styles.messageTextError]}>{error}</Text>
                    </View>
                  )}
                  {successMessage !== '' && (
                    <View style={[styles.messageBanner, styles.messageSuccess]}>
                      <AlertCircle size={18} color={COLORS.success} />
                      <Text style={[styles.messageText, styles.messageTextSuccess]}>{successMessage}</Text>
                    </View>
                  )}

                  {isSignUp && (
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Nome completo</Text>
                      <TextInput
                        style={[
                          styles.fieldInput,
                          focusedField === 'name' && styles.fieldInputFocused,
                          hasNameError && styles.fieldInputError,
                        ]}
                        placeholder="Nome completo"
                        placeholderTextColor="#888"
                        value={name}
                        onChangeText={(t) => { setName(t); if (showValidationErrors) setShowValidationErrors(false); }}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        editable={!isLoading}
                        autoCapitalize="words"
                      />
                    </View>
                  )}

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>E-mail</Text>
                    <TextInput
                      style={[
                        styles.fieldInput,
                        focusedField === 'email' && styles.fieldInputFocused,
                        hasEmailError && styles.fieldInputError,
                      ]}
                      placeholder="E-mail"
                      placeholderTextColor="#888"
                      value={email}
                      onChangeText={(t) => { setEmail(t); if (showValidationErrors) setShowValidationErrors(false); }}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      textContentType="emailAddress"
                      autoComplete="email"
                      editable={!isLoading}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Senha</Text>
                    <View
                      style={[
                        styles.passwordWrap,
                        focusedField === 'password' && styles.fieldInputFocused,
                        hasPasswordError && styles.fieldInputError,
                      ]}
                    >
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Senha"
                        placeholderTextColor="#888"
                        value={password}
                        onChangeText={(t) => { setPassword(t); if (showValidationErrors) setShowValidationErrors(false); }}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        secureTextEntry={!showPassword}
                        textContentType={isSignUp ? 'newPassword' : 'password'}
                        autoComplete={isSignUp ? 'password-new' : 'password'}
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPassword((v) => !v)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        {showPassword ? (
                          <EyeOff size={22} color="#555" />
                        ) : (
                          <Eye size={22} color="#555" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {!isSignUp && (
                    <TouchableOpacity
                      style={styles.forgotPasswordLink}
                      onPress={handleForgotPassword}
                      disabled={isLoading || isResettingPassword}
                    >
                      {isResettingPassword ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <Text style={styles.forgotPasswordText}>Esqueci a senha</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {Platform.OS === 'android' ? (
                    <Pressable
                      onPress={handleAuth}
                      onPressIn={() => {
                        if (isLoading) return;
                        Animated.timing(buttonScale, {
                          toValue: 0.98,
                          duration: 80,
                          useNativeDriver: true,
                        }).start();
                      }}
                      onPressOut={() => {
                        Animated.spring(buttonScale, {
                          toValue: 1,
                          useNativeDriver: true,
                          friction: 6,
                          tension: 200,
                        }).start();
                      }}
                      disabled={isLoading}
                      android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: false }}
                      style={styles.primaryButtonWrap}
                    >
                      <Animated.View
                        style={[
                          styles.primaryButton,
                          isLoading && styles.primaryButtonDisabled,
                          { transform: [{ scale: buttonScale }] },
                        ]}
                      >
                        <LinearGradient
                          colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.primaryButtonGradient}
                        >
                          {isLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
                          )}
                        </LinearGradient>
                      </Animated.View>
                    </Pressable>
                  ) : (
                    <TouchableOpacity
                      onPress={handleAuth}
                      onPressIn={() => {
                        if (isLoading) return;
                        Animated.timing(buttonScale, {
                          toValue: 0.98,
                          duration: 80,
                          useNativeDriver: true,
                        }).start();
                      }}
                      onPressOut={() => {
                        Animated.spring(buttonScale, {
                          toValue: 1,
                          useNativeDriver: true,
                          friction: 6,
                          tension: 200,
                        }).start();
                      }}
                      disabled={isLoading}
                      activeOpacity={1}
                      style={styles.primaryButtonWrap}
                    >
                      <Animated.View
                        style={[
                          styles.primaryButton,
                          isLoading && styles.primaryButtonDisabled,
                          { transform: [{ scale: buttonScale }] },
                        ]}
                      >
                        <LinearGradient
                          colors={[COLORS.gradientStart, COLORS.gradientMiddle]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.primaryButtonGradient}
                        >
                          {isLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
                          )}
                        </LinearGradient>
                      </Animated.View>
                    </TouchableOpacity>
                  )}

                  <View style={styles.orDivider}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>ou</Text>
                    <View style={styles.orLine} />
                  </View>
                  <TouchableOpacity
                    style={[styles.googleButton, isGoogleLoading && styles.googleButtonDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={isLoading || isGoogleLoading}
                    activeOpacity={0.8}
                  >
                    {isGoogleLoading ? (
                      <ActivityIndicator size="small" color="#333" />
                    ) : (
                      <Text style={styles.googleButtonText}>Entrar com Google</Text>
                    )}
                  </TouchableOpacity>
                  {Platform.OS === 'web' && (
                    <Text style={styles.googleHint}>
                      Login seguro. O navegador pode pedir para abrir o site de autenticação.
                    </Text>
                  )}
                </View>
              </Animated.View>

              {/* Acesso rápido - estilo links no rodapé */}
              <Animated.View style={[styles.quickAccess, { opacity: quickOpacity }]}>
                <Text style={styles.quickAccessTitle}>Acesso rápido</Text>
                <View style={styles.quickAccessRow}>
                  <TouchableOpacity
                    onPress={() => {
                      setEmail('admin@conviva.com');
                      setPassword('admin123');
                      setIsSignUp(false);
                      setShowValidationErrors(false);
                    }}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickAccessBtnText}>Admin</Text>
                  </TouchableOpacity>
                  <View style={styles.quickAccessDot} />
                  <TouchableOpacity
                    onPress={() => {
                      setEmail('user@conviva.com');
                      setPassword('user123');
                      setIsSignUp(false);
                      setShowValidationErrors(false);
                    }}
                    disabled={isLoading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickAccessBtnText}>Usuário</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.quickAccessSubtitle}>Jornada (teste)</Text>
                <View style={styles.quickAccessRow}>
                  {[
                    { email: 'semente@conviva.com', label: 'Ouvir', pwd: 'teste123' },
                    { email: 'raiz@conviva.com', label: 'Seguir', pwd: 'teste123' },
                    { email: 'caule@conviva.com', label: 'Permanecer', pwd: 'teste123' },
                    { email: 'fruto@conviva.com', label: 'Frutificar', pwd: 'teste123' },
                    { email: 'colheita@conviva.com', label: 'Multiplicar', pwd: 'teste123' },
                  ].map((acc, i) => (
                    <React.Fragment key={acc.email}>
                      {i > 0 && <View style={styles.quickAccessDot} />}
                      <TouchableOpacity
                        onPress={() => {
                          setEmail(acc.email);
                          setPassword(acc.pwd);
                          setIsSignUp(false);
                          setShowValidationErrors(false);
                        }}
                        disabled={isLoading}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quickAccessBtnText}>{acc.label}</Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  ))}
                </View>
              </Animated.View>
            </ContentWrapper>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.gradientStart },
  gradientBackground: { flex: 1 },
  wrapper: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  container: {
    flex: 1,
    ...(Platform.OS === 'web' && { opacity: 0, transition: 'opacity 0.5s ease-out' as any }),
  },
  visible: { opacity: 1 },

  // Header — profissional e jovem
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: { elevation: 8 },
    }),
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 6,
  },
  brandName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 1,
  },
  brandBold: { fontWeight: '800' },
  taglineWrap: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },

  // Card do formulário
  formCard: {
    marginHorizontal: 20,
    marginTop: 0,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: GLASS_BORDER_COLOR,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.2,
        shadowRadius: 25,
      },
      android: { elevation: 10 },
    }),
  },
  formInner: {
    position: 'relative',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 22,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  tabText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  tabTextActive: { color: COLORS.primary },

  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    gap: 10,
  },
  messageError: { backgroundColor: 'rgba(211, 47, 47, 0.5)' },
  messageSuccess: { backgroundColor: 'rgba(76, 175, 80, 0.08)' },
  messageText: { fontSize: 13, flex: 1, fontWeight: '500' },
  messageTextError: { color: '#fff' },
  messageTextSuccess: { color: COLORS.success },

  fieldGroup: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  fieldInput: {
    height: 52,
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#111827',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  fieldInputFocused: { borderColor: COLORS.primary, borderWidth: 1 },
  fieldInputError: { borderColor: COLORS.error, borderWidth: 1.5 },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 0,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 15,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  eyeBtn: { padding: 12 },
  forgotPasswordLink: {
    alignSelf: 'flex-start',
    marginTop: -6,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },

  primaryButtonWrap: {
    marginTop: 18,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  primaryButton: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  primaryButtonGradient: {
    height: 56,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.65 },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
    gap: 12,
  },
  orLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.35)' },
  orText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  googleButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  googleButtonDisabled: { opacity: 0.7 },
  googleButtonText: { fontSize: 16, fontWeight: '700', color: '#333' },
  googleHint: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },

  quickAccess: {
    marginTop: 30,
    alignItems: 'center',
  },
  quickAccessTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  quickAccessSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  quickAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  quickAccessBtn: {},
  quickAccessBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  quickAccessDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    opacity: 0.5,
  },
});
