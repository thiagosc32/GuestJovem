/**
 * ============================================================================
 * ARQUIVO: navigation.ts
 * FUNÇÃO: Definição de tipos para o React Navigation (TypeScript).
 * ============================================================================
 */

export type RootStackParamList = {
  Auth: undefined;
  AdminTabs: undefined;
  UserTabs: undefined;
  QRCodeScanner: undefined;
  PrayerRequestScreen: { requestId?: string };
  NotificationScreen: undefined;
  CreateDevotional: undefined;
  CreateEvent: undefined;
  CreateEventScreen: { event?: any } | undefined;
  UserManagement: undefined;
  EventPresenceScreen: undefined;
  AppSettings: undefined;
  EventDetails: undefined;
  RegistrationScreen: undefined;
  AdminPrivatePrayers: undefined;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AttendanceTracker: undefined;
  AnalyticsScreen: undefined;
  NotificationScreen: undefined;
  // Adicionado para aparecer no menu/navegação do Admin
  AppSettings: undefined; 
};

export type UserTabParamList = {
  UserDashboard: undefined;
  DevotionalScreen: undefined;
  CommunityWall: undefined;
  EventsScreen: undefined;
  ProfileScreen: undefined;
};