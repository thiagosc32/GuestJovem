import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Users, Calendar, Bell, BarChart3, User, BookOpen, MessageCircle, Sparkles, ListChecks } from 'lucide-react-native';
import CustomDrawerContent from './components/navigation/CustomDrawerContent';
import { getCurrentUser, supabase, isSupabaseConfigured, setSessionFromOAuthUrl, ensureUserProfileForOAuth, GOOGLE_REDIRECT_SCHEME } from './services/supabase';

const isOAuthCallbackUrl = (url: string) =>
  url.startsWith(GOOGLE_REDIRECT_SCHEME) || (url.includes('#') && url.includes('access_token='));

// IMPORTS DE TELAS EXISTENTES
import AuthScreen from './screens/AuthScreen';
import VisitorCheckInScreen from './screens/visitor/VisitorCheckInScreen';
import AdminDashboard from './screens/admin/AdminDashboard';
import QRCodeScanner from './screens/admin/QRCodeScanner';
import AttendanceTracker from './screens/admin/AttendanceTracker';
import AnalyticsScreen from './screens/admin/AnalyticsScreen';
import CreateDevotionalScreen from './screens/admin/CreateDevotionalScreen';
import CreateAnnouncementScreen from './screens/admin/CreateAnnouncementScreen';
import UserManagementScreen from './screens/admin/UserManagementScreen';
import EventPresenceScreen from './screens/admin/EventPresenceScreen';
import AdminPrivatePrayersScreen from './screens/admin/AdminPrivatePrayersScreen';
import UserDashboard from './screens/user/UserDashboard';
import DevotionalScreen from './screens/user/DevotionalScreen';
import PrayerRequestScreen from './screens/user/PrayerRequestScreen';
import CommunityWall from './screens/user/CommunityWall';
import EventsScreen from './screens/user/EventsScreen';
import ProfileScreen from './screens/user/ProfileScreen';
import JourneyScreen from './screens/user/JourneyScreen';
import DisciplinesScreen from './screens/user/DisciplinesScreen';
import SpiritualReflectionsScreen from './screens/user/SpiritualReflectionsScreen';
import BibleScreen from './screens/user/BibleScreen';
import BadgesScreen from './screens/user/BadgesScreen';
import VerseOfTheDayScreen from './screens/user/VerseOfTheDayScreen';
import GuidedStudiesScreen from './screens/user/GuidedStudiesScreen';
import NotificationScreen from './screens/shared/NotificationScreen';
import EventDetails from './screens/user/EventDetails';
import EventPaymentScreen from './screens/user/EventPaymentScreen';
import CreateEventScreen from './screens/admin/CreateEventScreen';
import AppSettingsScreen from './screens/admin/AppSettingsScreen';
import VersiculosScreen from './screens/admin/VersiculosScreen';
import RegistrationScreen from './screens/user/RegistrationScreen';
import SpiritualTermsScreen from './screens/user/SpiritualTermsScreen';
import AdminAchievementsScreen from './screens/admin/AdminAchievementsScreen';
import AdminDevotionalCompletionsScreen from './screens/admin/AdminDevotionalCompletionsScreen';
import AdminActiveYouthScreen from './screens/admin/AdminActiveYouthScreen';
import VisitorsControlScreen from './screens/admin/VisitorsControlScreen';
import MinistriesListScreen from './screens/admin/MinistriesListScreen';
import MinistryDetailScreen from './screens/admin/MinistryDetailScreen';
import MinistryAgendaScreen from './screens/admin/MinistryAgendaScreen';
import DepartmentsListScreen from './screens/admin/DepartmentsListScreen';
import DepartmentDetailScreen from './screens/admin/DepartmentDetailScreen';
import DepartmentAgendaScreen from './screens/admin/DepartmentAgendaScreen';
import ScheduleTypesListScreen from './screens/admin/ScheduleTypesListScreen';
import ScheduleTypeFormScreen from './screens/admin/ScheduleTypeFormScreen';
import OnboardingLevelModal from './components/OnboardingLevelModal';
import WebLayoutWrapper from './components/WebLayoutWrapper';
import { COLORS } from './constants/colors';
import { RootStackParamList, AdminTabParamList, UserTabParamList, UserDrawerParamList, PresençaStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const PresençaStackNav = createNativeStackNavigator<PresençaStackParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();
const UserTab = createBottomTabNavigator<UserTabParamList>();
const UserDrawer = createDrawerNavigator<UserDrawerParamList>();

function PresençaStackNavigator() {
  return (
    <PresençaStackNav.Navigator screenOptions={{ headerShown: false }}>
      <PresençaStackNav.Screen name="AttendanceTracker" component={AttendanceTracker} />
      <PresençaStackNav.Screen name="EventPresenceScreen" component={EventPresenceScreen} />
      <PresençaStackNav.Screen name="VisitorsControlScreen" component={VisitorsControlScreen} />
    </PresençaStackNav.Navigator>
  );
}

function AdminTabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <AdminTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 10,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <AdminTab.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <AdminTab.Screen
        name="PresençaStack"
        component={PresençaStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('PresençaStack', { screen: 'AttendanceTracker' });
          },
        })}
        options={{
          tabBarLabel: 'Presença',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <AdminTab.Screen
        name="AnalyticsScreen"
        component={AnalyticsScreen}
        options={{
          tabBarLabel: 'Análises',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
      <AdminTab.Screen
        name="NotificationScreen"
        component={NotificationScreen}
        options={{
          tabBarLabel: 'Notificações',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
    </AdminTab.Navigator>
  );
}

/** Nomes das telas que aparecem no menu inferior (4 itens com espaçamento uniforme). */
const VISIBLE_TAB_ROUTES: (keyof UserTabParamList)[] = [
  'UserDashboard',
  'DevotionalScreen',
  'EventsScreen',
  'ProfileScreen',
];

/** Tab bar que mostra só os 4 itens visíveis. "Focused" usa a rota real: em telas ocultas (Jornada, Disciplinas, etc.) nenhum item fica selecionado e todos os toques naveguem. */
function UserTabBar(props: React.ComponentProps<typeof BottomTabBar>) {
  const { state, descriptors, navigation } = props;
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((r) =>
    VISIBLE_TAB_ROUTES.includes(r.name as keyof UserTabParamList)
  );
  const currentRouteName = state.routes[state.index]?.name;

  return (
    <View
      style={[
        userTabBarStyles.bar,
        {
          height: 60 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 10,
        },
      ]}
    >
      {visibleRoutes.map((route) => {
        const descriptor = descriptors[route.key];
        const options = descriptor?.options ?? {};
        const focused = currentRouteName === route.name;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : (options.title ?? route.name);
        const IconComponent = options.tabBarIcon as React.ComponentType<{ color: string; size: number }> | undefined;
        const color = focused ? COLORS.primary : COLORS.textSecondary;

        const onPress = () => {
          navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused) {
            navigation.dispatch({
              ...CommonActions.navigate(route),
              target: state.key,
            });
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={userTabBarStyles.item}
            onPress={onPress}
            activeOpacity={0.7}
          >
            {IconComponent ? <IconComponent color={color} size={24} /> : null}
            <Text style={[userTabBarStyles.label, { color }]} numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const userTabBarStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});

/** Bottom Tab: só 4 itens visíveis (Início, Devocional, Eventos, Perfil). Jornada e Disciplinas são telas do mesmo Tab mas sem ícone no menu — assim o menu inferior aparece nelas quando abertas pelo drawer. */
function UserTabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <UserTab.Navigator
      tabBar={(props) => <UserTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 10,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarItemStyle: { flex: 1 },
      }}
    >
      <UserTab.Screen name="UserDashboard" component={UserDashboard} options={{ tabBarLabel: 'Início', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <UserTab.Screen name="DevotionalScreen" component={DevotionalScreen} options={{ tabBarLabel: 'Devocional', tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }} />
      <UserTab.Screen name="EventsScreen" component={EventsScreen} options={{ tabBarLabel: 'Eventos', tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }} />
      <UserTab.Screen name="JourneyScreen" component={JourneyScreen} options={{ tabBarButton: () => null }} />
      <UserTab.Screen name="DisciplinesScreen" component={DisciplinesScreen} options={{ tabBarButton: () => null }} />
      <UserTab.Screen name="SpiritualReflectionsScreen" component={SpiritualReflectionsScreen} options={{ tabBarButton: () => null }} />
      <UserTab.Screen name="CommunityWall" component={CommunityWall} options={{ tabBarButton: () => null }} />
      <UserTab.Screen name="PrayerRequestScreen" component={PrayerRequestScreen} options={{ tabBarButton: () => null }} />
      <UserTab.Screen name="BibleScreen" component={BibleScreen} options={{ tabBarButton: () => null }} />
      <UserTab.Screen name="BadgesScreen" component={BadgesScreen} options={{ tabBarButton: () => null }} />
      <UserTab.Screen name="VerseOfTheDayScreen" component={VerseOfTheDayScreen} options={{ tabBarButton: () => null }} />
      <UserTab.Screen name="GuidedStudiesScreen" component={GuidedStudiesScreen} options={{ tabBarButton: () => null }} />
      <UserTab.Screen name="ProfileScreen" component={ProfileScreen} options={{ tabBarLabel: 'Perfil', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </UserTab.Navigator>
  );
}

/** Drawer (sidebar): menu hambúrguer com Jornada, Disciplinas, Comunidade, Pedidos de Oração + Logout */
function UserDrawerNavigator() {
  return (
    <UserDrawer.Navigator
      drawerContent={(props: any) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        swipeEnabled: true,
        drawerStyle: { width: 280 },
      }}
      initialRouteName="MainTabs"
    >
      <UserDrawer.Screen
        name="MainTabs"
        component={UserTabNavigator}
        options={{ drawerLabel: 'Início', drawerIcon: ({ color, size }: { color: string; size: number }) => <Home color={color} size={size} /> }}
      />
    </UserDrawer.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [supabaseRetry, setSupabaseRetry] = useState(0);

  // No Android o Constants.expoConfig.extra às vezes só fica disponível após a primeira tela; reavaliar até 5 vezes
  useEffect(() => {
    if (isSupabaseConfigured() || supabaseRetry >= 5) return;
    const t = setTimeout(() => setSupabaseRetry((n) => n + 1), 400);
    return () => clearTimeout(t);
  }, [supabaseRetry]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUserRole(null);
        setIsAuthenticated(false);
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const handleOAuthRedirect = async (url: string | null) => {
      if (!url || !isOAuthCallbackUrl(url)) return;
      // PWA/atalho: se esta aba for uma popup do login Google, enviamos a URL para o atalho (opener) e fechamos
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.opener) {
        try {
          window.opener.postMessage({ type: 'OAUTH_CALLBACK', url }, window.location.origin);
        } catch (_) {}
        window.close();
        return;
      }
      try {
        await setSessionFromOAuthUrl(url);
        await ensureUserProfileForOAuth();
        const user = await getCurrentUser();
        if (user) {
          setUserRole((user as { role?: 'admin' | 'user' }).role ?? 'user');
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('OAuth callback error:', e);
      }
    };
    Linking.getInitialURL().then(handleOAuthRedirect);
    const sub = Linking.addEventListener('url', ({ url }) => handleOAuthRedirect(url));
    return () => sub.remove();
  }, []);

  const checkAuthStatus = async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    try {
      const user = await getCurrentUser();
      if (user) {
        setUserRole((user as { role?: 'admin' | 'user' }).role ?? null);
        setIsAuthenticated(true);
      } else {
        setUserRole(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      setInitError('Failed to initialize app.');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <View style={[styles.loadingContainer, { padding: 24 }]}>
        <Text style={[styles.loadingText, { marginBottom: 12, textAlign: 'center' }]}>
          Supabase não configurado
        </Text>
        <Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginBottom: 8 }}>
          Configure EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no expo.dev e gere um novo build.
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' }}>
          Use o AAB/APK do mesmo build em que o log do EAS mostrou &quot;Using app configuration&quot; com URL e key em extra.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <WebLayoutWrapper>
        <NavigationContainer
          linking={{
            prefixes: [Linking.createURL(''), 'fireyouth://', 'guestjovem://'],
            config: {
              screens: {
                VisitorCheckIn: 'visitor/:eventId',
              },
            },
          }}
        >
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
              <>
                <Stack.Screen name="Auth">
                  {(props) => (
                    <AuthScreen {...props} onAuthenticate={(role) => { setUserRole(role); setIsAuthenticated(true); }} />
                  )}
                </Stack.Screen>
                <Stack.Screen name="VisitorCheckIn" component={VisitorCheckInScreen} />
              </>
            ) : (
              <>
                {/* Navegação principal: Drawer (menu hambúrguer) + Bottom Tab (Início, Devocional, Eventos, Perfil) */}
                <Stack.Screen name="UserTabs" component={UserDrawerNavigator} />
                {userRole === 'admin' && (
                  <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
                )}
                <Stack.Screen name="QRCodeScanner" component={QRCodeScanner} />
                <Stack.Screen name="CreateDevotional" component={CreateDevotionalScreen} options={{ headerShown: false }} />
                <Stack.Screen name="CreateAnnouncement" component={CreateAnnouncementScreen} options={{ headerShown: false }} />
                <Stack.Screen name="CreateEventScreen" component={CreateEventScreen} options={{ headerShown: false }} />
                <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ title: 'Gestão de Usuários' }} />
                <Stack.Screen name="AppSettings" component={AppSettingsScreen} options={{ title: 'Configurações do App' }} />
                <Stack.Screen name="Versiculos" component={VersiculosScreen} options={{ headerShown: false }} />
                {/* EventPresenceScreen fica dentro da aba Presença (PresençaStack) para o menu inferior aparecer */}
                <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
                <Stack.Screen name="AdminPrivatePrayers" component={AdminPrivatePrayersScreen} options={{ title: 'Pedidos privados' }} />
                <Stack.Screen name="EventDetails" component={EventDetails} options={{ title: 'Detalhes do Evento' }} />
                <Stack.Screen name="EventPaymentScreen" component={EventPaymentScreen} options={{ title: 'Pagamento' }} />
                <Stack.Screen name="RegistrationScreen" component={RegistrationScreen} />
                <Stack.Screen name="SpiritualTerms" component={SpiritualTermsScreen} options={{ title: 'Termos de uso espiritual', headerShown: true, headerTintColor: COLORS.primary }} />
                <Stack.Screen name="AdminAchievements" component={AdminAchievementsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AdminDevotionalCompletions" component={AdminDevotionalCompletionsScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AdminActiveYouth" component={AdminActiveYouthScreen} options={{ headerShown: false }} />
                <Stack.Screen name="MinistriesList" component={MinistriesListScreen} options={{ headerShown: false }} />
                <Stack.Screen name="MinistryDetail" component={MinistryDetailScreen} options={{ headerShown: false }} />
                <Stack.Screen name="MinistryAgenda" component={MinistryAgendaScreen} options={{ headerShown: false }} />
                <Stack.Screen name="DepartmentsList" component={DepartmentsListScreen} options={{ headerShown: false }} />
                <Stack.Screen name="DepartmentDetail" component={DepartmentDetailScreen} options={{ headerShown: false }} />
                <Stack.Screen name="DepartmentAgenda" component={DepartmentAgendaScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ScheduleTypesList" component={ScheduleTypesListScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ScheduleTypeForm" component={ScheduleTypeFormScreen} options={{ headerShown: false }} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
        {isAuthenticated && <OnboardingLevelModal />}
        </WebLayoutWrapper>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 16, fontSize: 16, color: COLORS.textSecondary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 24 },
  errorText: { fontSize: 18, fontWeight: '600', color: COLORS.error, textAlign: 'center', marginBottom: 8 },
  errorSubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});