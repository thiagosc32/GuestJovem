import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Users, Calendar, Bell, BarChart3, User, BookOpen, MessageCircle } from 'lucide-react-native';
import { getCurrentUser, supabase } from './services/supabase';

// IMPORTS DE TELAS EXISTENTES
import AuthScreen from './screens/AuthScreen';
import AdminDashboard from './screens/admin/AdminDashboard';
import QRCodeScanner from './screens/admin/QRCodeScanner';
import AttendanceTracker from './screens/admin/AttendanceTracker';
import AnalyticsScreen from './screens/admin/AnalyticsScreen';
import CreateDevotionalScreen from './screens/admin/CreateDevotionalScreen';
import UserManagementScreen from './screens/admin/UserManagementScreen';
import EventPresenceScreen from './screens/admin/EventPresenceScreen';
import AdminPrivatePrayersScreen from './screens/admin/AdminPrivatePrayersScreen';
import UserDashboard from './screens/user/UserDashboard';
import DevotionalScreen from './screens/user/DevotionalScreen';
import PrayerRequestScreen from './screens/user/PrayerRequestScreen';
import CommunityWall from './screens/user/CommunityWall';
import EventsScreen from './screens/user/EventsScreen';
import ProfileScreen from './screens/user/ProfileScreen';
import NotificationScreen from './screens/shared/NotificationScreen';
import EventDetails from './screens/user/EventDetails';
import CreateEventScreen from './screens/admin/CreateEventScreen';
import AppSettingsScreen from './screens/admin/AppSettingsScreen';
import RegistrationScreen from './screens/user/RegistrationScreen'; 

import { COLORS } from './constants/colors';
import { RootStackParamList, AdminTabParamList, UserTabParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();
const UserTab = createBottomTabNavigator<UserTabParamList>();

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
        name="AttendanceTracker"
        component={AttendanceTracker}
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

function UserTabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <UserTab.Navigator
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
        tabBarLabelStyle: { fontSize: 9, fontWeight: '600' },
      }}
    >
      <UserTab.Screen name="UserDashboard" component={UserDashboard} options={{ tabBarLabel: 'Início', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <UserTab.Screen name="DevotionalScreen" component={DevotionalScreen} options={{ tabBarLabel: 'Devocional', tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }} />
      <UserTab.Screen name="CommunityWall" component={CommunityWall} options={{ tabBarLabel: 'Mesa Guest', tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }} />
      <UserTab.Screen name="EventsScreen" component={EventsScreen} options={{ tabBarLabel: 'Eventos', tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }} />
      <UserTab.Screen name="ProfileScreen" component={ProfileScreen} options={{ tabBarLabel: 'Perfil', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </UserTab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => { checkAuthStatus(); }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUserRole(null);
        setIsAuthenticated(false);
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setUserRole(user.role);
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
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
              <Stack.Screen name="Auth">
                {(props) => (
                  <AuthScreen {...props} onAuthenticate={(role) => { setUserRole(role); setIsAuthenticated(true); }} />
                )}
              </Stack.Screen>
            ) : (
              <>
                {/* Todos os usuários (incluindo admin) iniciam na tela de usuário */}
                <Stack.Screen name="UserTabs" component={UserTabNavigator} />
                {/* Admin pode acessar o painel via botão no perfil */}
                {userRole === 'admin' && (
                  <Stack.Screen name="AdminTabs" component={AdminTabNavigator} />
                )}
                <Stack.Screen name="QRCodeScanner" component={QRCodeScanner} />
                <Stack.Screen name="PrayerRequestScreen" component={PrayerRequestScreen} />
                <Stack.Screen name="CreateDevotional" component={CreateDevotionalScreen} options={{ title: 'Criar Devocional' }} />
                <Stack.Screen name="CreateEventScreen" component={CreateEventScreen} options={{ headerShown: false }} />
                <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ title: 'Gestão de Usuários' }} />
                <Stack.Screen name="AppSettings" component={AppSettingsScreen} options={{ title: 'Configurações do App' }} />
                
                {/* MOVIDO PARA O BLOCO ADMIN: A tela de presença deve estar aqui para o Dashboard Admin acessá-la */}
                <Stack.Screen 
                  name="EventPresenceScreen" 
                  component={EventPresenceScreen} 
                  options={{ 
                    headerShown: true, 
                    title: 'Presença em Eventos',
                    headerTintColor: COLORS.primary 
                  }} 
                />
                <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
                <Stack.Screen name="AdminPrivatePrayers" component={AdminPrivatePrayersScreen} options={{ title: 'Pedidos privados' }} />
                <Stack.Screen name="EventDetails" component={EventDetails} options={{ title: 'Detalhes do Evento' }} />
                <Stack.Screen name="RegistrationScreen" component={RegistrationScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
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