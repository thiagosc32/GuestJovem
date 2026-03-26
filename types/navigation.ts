/**
 * ============================================================================
 * ARQUIVO: navigation.ts
 * FUNÇÃO: Definição de tipos para o React Navigation (TypeScript).
 * ============================================================================
 */

export type RootStackParamList = {
  Auth: undefined;
  UpdatePassword: undefined;
  VisitorOnboarding: { token: string };
  AdminTabs: undefined;
  UserTabs: undefined;
  QRCodeScanner: { eventId?: string } | undefined;
  PrayerRequestScreen: { requestId?: string };
  NotificationScreen: undefined;
  CreateDevotional: { devotional?: any } | undefined;
  CreateAnnouncement: { announcement?: any } | undefined;
  CreateEvent: undefined;
  CreateEventScreen: { event?: any } | undefined;
  UserManagement: undefined;
  EventPresenceScreen: undefined;
  AppSettings: undefined;
  Versiculos: undefined;
  EventDetails: { eventId: string };
  EventPaymentScreen: { eventId: string };
  RegistrationScreen: undefined;
  AdminPrivatePrayers: undefined;
  SpiritualTerms: undefined;
  AdminAchievements: undefined;
  AdminDevotionalCompletions: undefined;
  AdminActiveYouth: undefined;
  MinistriesList: undefined;
  MinistryDetail: { ministryKey: string; ministryName?: string };
  MinistryAgenda: { ministryKey: string };
  DepartmentsList: undefined;
  DepartmentDetail: { ministryKey: string; ministryName?: string };
  DepartmentAgenda: { ministryKey: string; ministryName?: string };
  ScheduleTypesList: undefined;
  ScheduleTypeForm: { scheduleTypeId?: string; defaultKey?: string; defaultLabel?: string };
};

/** Stack da aba Presença: lista de presenças e Presença em Eventos (com menu inferior visível). */
export type PresençaStackParamList = {
  AttendanceTracker: undefined;
  EventPresenceScreen: undefined;
  VisitorsControlScreen: undefined;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  PresençaStack: undefined | { screen: keyof PresençaStackParamList; params?: object };
  AnalyticsScreen: undefined;
  NotificationScreen: undefined;
  AppSettings: undefined;
};

/** Tab Navigator: 4 itens visíveis no menu (Início, Devocional, Eventos, Perfil). Jornada, Disciplinas, Reflexões e outras são telas sem ícone no menu — acessíveis pelo drawer. */
export type UserTabParamList = {
  UserDashboard: undefined;
  DevotionalScreen: undefined;
  EventsScreen: undefined;
  JourneyScreen: undefined;
  DisciplinesScreen: undefined;
  SpiritualReflectionsScreen: undefined;
  CommunityWall: undefined;
  PrayerRequestScreen: { requestId?: string } | undefined;
  ProfileScreen: undefined;
  BibleScreen: undefined;
  BadgesScreen: undefined;
  VerseOfTheDayScreen: undefined;
  GuidedStudiesScreen: { studyId?: string } | undefined;
};

/** Drawer: Comunidade, Pedidos de Oração. Jornada e Disciplinas abrem as abas em MainTabs. */
export type UserDrawerParamList = {
  MainTabs: undefined;
};