export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'user' | 'admin'
          phone: string | null
          avatar_url: string | null
          last_active: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'user' | 'admin'
          phone?: string | null
          avatar_url?: string | null
          last_active?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'user' | 'admin'
          phone?: string | null
          avatar_url?: string | null
          last_active?: string
          created_at?: string
        }
      }
      youth_profiles: {
        Row: {
          id: string
          user_id: string
          date_of_birth: string | null
          parent_name: string | null
          parent_contact: string | null
          emergency_contact: string | null
          medical_info: string | null
          baptized: boolean
          member_since: string | null
          small_group: string | null
          church: string | null
          calling: 'Apóstolo' | 'Profeta' | 'Evangelista' | 'Pastor' | 'Mestre' | null
          volunteer: string[] | null
          baptism_date: string | null
          birthdate: string | null
          youth_role: 'jovem' | 'lider' | 'voluntario' | 'staff' | 'admin' | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date_of_birth?: string | null
          parent_name?: string | null
          parent_contact?: string | null
          emergency_contact?: string | null
          medical_info?: string | null
          baptized?: boolean
          member_since?: string | null
          small_group?: string | null
          church?: string | null
          calling?: 'Apóstolo' | 'Profeta' | 'Evangelista' | 'Pastor' | 'Mestre' | null
          volunteer?: string[] | null
          baptism_date?: string | null
          birthdate?: string | null
          youth_role?: 'jovem' | 'lider' | 'voluntario' | 'staff' | 'admin' | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date_of_birth?: string | null
          parent_name?: string | null
          parent_contact?: string | null
          emergency_contact?: string | null
          medical_info?: string | null
          baptized?: boolean
          member_since?: string | null
          small_group?: string | null
          church?: string | null
          calling?: 'Apóstolo' | 'Profeta' | 'Evangelista' | 'Pastor' | 'Mestre' | null
          volunteer?: string[] | null
          baptism_date?: string | null
          birthdate?: string | null
          youth_role?: 'jovem' | 'lider' | 'voluntario' | 'staff' | 'admin' | null
          created_at?: string
        }
      }
      devotionals: {
        Row: {
          id: string
          title: string
          date: string
          category: 'faith' | 'love' | 'hope' | 'courage' | 'wisdom'
          scripture: string
          content: string
          reflection: string
          prayer_points: string[]
          author: string | null
          author_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          date: string
          category: 'faith' | 'love' | 'hope' | 'courage' | 'wisdom'
          scripture: string
          content: string
          reflection: string
          prayer_points: string[]
          author?: string | null
          author_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          date?: string
          category?: 'faith' | 'love' | 'hope' | 'courage' | 'wisdom'
          scripture?: string
          content?: string
          reflection?: string
          prayer_points?: string[]
          author?: string | null
          author_id?: string | null
          created_at?: string
        }
      }
      prayer_requests: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          category: 'personal' | 'family' | 'health' | 'spiritual' | 'other'
          is_public: boolean
          is_answered: boolean
          testimony: string | null
          leadership_message: string | null
          prayer_count: number
          comments_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          category: 'personal' | 'family' | 'health' | 'spiritual' | 'other'
          is_public?: boolean
          is_answered?: boolean
          testimony?: string | null
          leadership_message?: string | null
          prayer_count?: number
          comments_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          category?: 'personal' | 'family' | 'health' | 'spiritual' | 'other'
          is_public?: boolean
          is_answered?: boolean
          testimony?: string | null
          leadership_message?: string | null
          prayer_count?: number
          comments_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      prayer_request_comments: {
        Row: {
          id: string
          prayer_request_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          prayer_request_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          prayer_request_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
      prayer_request_prayers: {
        Row: {
          user_id: string
          request_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          request_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          request_id?: string
          created_at?: string
        }
      }
      community_posts: {
        Row: {
          id: string
          user_id: string
          content: string
          image_url: string | null
          likes_count: number
          comments_count: number
          is_moderated: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          image_url?: string | null
          likes_count?: number
          comments_count?: number
          is_moderated?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          image_url?: string | null
          likes_count?: number
          comments_count?: number
          is_moderated?: boolean
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          event_title: 'Overnight' | 'Guest Fire' | 'Table' | 'Outside' | 'Guest Play' | 'Guest Lover' | null
          event_type: 'Culto' | 'Oração' | 'Vigilia' | 'Confraternização' | null
          description: string
          date: string
          time: string
          location: string
          category: 'worship' | 'outreach' | 'study' | 'fellowship' | 'service'
          max_attendees: number | null
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          event_title?: 'Overnight' | 'Guest Fire' | 'Table' | 'Outside' | 'Guest Play' | 'Guest Lover' | null
          event_type?: 'Culto' | 'Oração' | 'Vigilia' | 'Confraternização' | null
          description: string
          date: string
          time: string
          location: string
          category: 'worship' | 'outreach' | 'study' | 'fellowship' | 'service'
          max_attendees?: number | null
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          event_title?: 'Overnight' | 'Guest Fire' | 'Table' | 'Outside' | 'Guest Play' | 'Guest Lover' | null
          event_type?: 'Culto' | 'Oração' | 'Vigilia' | 'Confraternização' | null
          description?: string
          date?: string
          time?: string
          location?: string
          category?: 'worship' | 'outreach' | 'study' | 'fellowship' | 'service'
          max_attendees?: number | null
          image_url?: string | null
          created_at?: string
        }
      }
      event_rsvps: {
        Row: {
          id: string
          event_id: string
          user_id: string
          status: 'confirmed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status?: 'confirmed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: 'confirmed' | 'cancelled'
          created_at?: string
        }
      }
      attendance_records: {
        Row: {
          id: string
          user_id: string
          event_id: string | null
          check_in_time: string
          method: 'qr' | 'manual'
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          event_id?: string | null
          check_in_time?: string
          method: 'qr' | 'manual'
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string | null
          check_in_time?: string
          method?: 'qr' | 'manual'
          notes?: string | null
        }
      }
      achievements: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          icon: string
          unlocked_at: string | null
          progress: number
          target: number
          category: 'attendance' | 'devotional' | 'prayer' | 'community' | 'service'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          icon: string
          unlocked_at?: string | null
          progress?: number
          target: number
          category: 'attendance' | 'devotional' | 'prayer' | 'community' | 'service'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          icon?: string
          unlocked_at?: string | null
          progress?: number
          target?: number
          category?: 'attendance' | 'devotional' | 'prayer' | 'community' | 'service'
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'event' | 'prayer' | 'achievement' | 'announcement' | 'reminder'
          title: string
          message: string
          is_read: boolean
          action_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'event' | 'prayer' | 'achievement' | 'announcement' | 'reminder'
          title: string
          message: string
          is_read?: boolean
          action_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'event' | 'prayer' | 'achievement' | 'announcement' | 'reminder'
          title?: string
          message?: string
          is_read?: boolean
          action_url?: string | null
          created_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          title: string
          message: string
          priority: 'high' | 'medium' | 'low'
          author_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          priority: 'high' | 'medium' | 'low'
          author_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          priority?: 'high' | 'medium' | 'low'
          author_id?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      verse_of_week: {
        Row: {
          id: string
          reference: string
          verse: string
          week_start: string
          week_end: string
          created_at: string
        }
        Insert: {
          id?: string
          reference: string
          verse: string
          week_start: string
          week_end: string
          created_at?: string
        }
        Update: {
          id?: string
          reference?: string
          verse?: string
          week_start?: string
          week_end?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_prayer_count: {
        Args: { request_id: string }
        Returns: void
      }
      toggle_pray: {
        Args: { p_user_id: string; p_request_id: string }
        Returns: { has_prayed: boolean; new_count: number }[]
      }
      increment_post_likes: {
        Args: { post_id: string }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}