export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
  phone?: string;
  dateOfBirth?: string;
  joinDate: string;
  spiritualGrowthLevel: number;
  attendanceCount: number;
  devotionalStreak: number;
  achievements: Achievement[];
}

export interface YouthProfile extends User {
  parentName?: string;
  parentPhone?: string;
  emergencyContact?: string;
  medicalInfo?: string;
  smallGroup?: string;
  church?: string;
  calling?: 'Apóstolo' | 'Profeta' | 'Evangelista' | 'Pastor' | 'Mestre';
  volunteer?: string[];
  baptismDate?: string;
  birthdate?: string;
  role: 'jovem' | 'lider' | 'voluntario' | 'staff' | 'admin';
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  bio: string;
  photoUri: string;
  church?: string;
  calling?: 'Apóstolo' | 'Profeta' | 'Evangelista' | 'Pastor' | 'Mestre';
  volunteer?: string[];
  baptismDate?: string;
  birthdate?: string;
  role?: 'jovem' | 'lider' | 'voluntario' | 'staff' | 'admin';
}

export interface Devotional {
  id: string;
  title: string;
  date: string;
  scripture: string;
  content: string;
  reflection: string;
  prayerPoints: string[];
  completed: boolean;
  category: 'faith' | 'love' | 'hope' | 'courage' | 'wisdom';
}

export interface PrayerRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  title: string;
  description: string;
  category: 'personal' | 'family' | 'health' | 'spiritual' | 'other';
  isPrivate: boolean;
  isAnswered: boolean;
  prayerCount: number;
  createdAt: string;
  answeredAt?: string;
  testimony?: string;
  /** Resposta da liderança (pedidos privados); não usar testimony para isso */
  leadershipMessage?: string;
  /** Número de comentários (do banco); exibido sem carregar a lista */
  commentsCount?: number;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  imageUrl?: string;
  likes: number;
  comments: Comment[];
  /** Número de comentários (do banco); use quando comments não for carregado */
  commentsCount?: number;
  isModerated: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  eventTitle?: 'Overnight' | 'Guest Fire' | 'Table' | 'Outside' | 'Guest Play' | 'Guest Lover';
  eventType?: 'Culto' | 'Oração' | 'Vigilia' | 'Confraternização';
  description: string;
  date: string;
  time: string;
  location: string;
  imageUrl?: string;
  category: 'worship' | 'outreach' | 'study' | 'fellowship' | 'service';
  attendees: string[];
  capacity?: number;
  isRegistrationOpen: boolean;
  rsvpCount?: number;
}

export interface EventRSVP {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  confirmedAt: string;
  status: 'confirmed' | 'cancelled';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  category: 'attendance' | 'devotional' | 'prayer' | 'community' | 'service';
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  eventId?: string;
  eventName?: string;
  checkInTime: string;
  checkInMethod: 'qr' | 'manual';
  notes?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'event' | 'prayer' | 'achievement' | 'announcement' | 'reminder';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface AnalyticsData {
  totalYouth: number;
  activeYouth: number;
  averageAttendance: number;
  devotionalCompletion: number;
  prayerRequests: number;
  answeredPrayers: number;
  upcomingEvents: number;
  weeklyGrowth: number;
  monthlyTrends: {
    month: string;
    attendance: number;
    devotionals: number;
    prayers: number;
  }[];
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  createdBy: string;
  createdAt: string;
  priority: 'high' | 'medium' | 'low';
  isActive: boolean;
}

export interface VerseOfWeek {
  id: string;
  verse: string;
  reference: string;
  weekStart: string;
  weekEnd: string;
}