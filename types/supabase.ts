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
          ministry_function: string | null
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
          ministry_function?: string | null
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
          ministry_function?: string | null
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
          event_title_snapshot: string | null
          event_date_snapshot: string | null
        }
        Insert: {
          id?: string
          user_id: string
          event_id?: string | null
          check_in_time?: string
          method: 'qr' | 'manual'
          notes?: string | null
          event_title_snapshot?: string | null
          event_date_snapshot?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string | null
          check_in_time?: string
          method?: 'qr' | 'manual'
          notes?: string | null
          event_title_snapshot?: string | null
          event_date_snapshot?: string | null
        }
      }
      visitor_profiles: {
        Row: {
          id: string
          name: string
          qr_code_token: string | null
          visit_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          qr_code_token?: string | null
          visit_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          qr_code_token?: string | null
          visit_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      event_visitors: {
        Row: {
          id: string
          event_id: string | null
          visitor_profile_id: string | null
          name: string | null
          is_first_time: boolean
          contact_opt_in: boolean
          phone: string | null
          accepted_jesus: boolean
          congregates: boolean
          church_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id?: string | null
          visitor_profile_id?: string | null
          name?: string | null
          is_first_time?: boolean
          contact_opt_in?: boolean
          phone?: string | null
          accepted_jesus?: boolean
          congregates?: boolean
          church_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string | null
          visitor_profile_id?: string | null
          name?: string | null
          is_first_time?: boolean
          contact_opt_in?: boolean
          phone?: string | null
          accepted_jesus?: boolean
          congregates?: boolean
          church_name?: string | null
          created_at?: string
        }
      }
      visitor_checkin_invites: {
        Row: {
          id: string
          event_id: string
          token: string
          created_at: string
          expires_at: string | null
          is_active: boolean
          created_by: string | null
        }
        Insert: {
          id?: string
          event_id: string
          token: string
          created_at?: string
          expires_at?: string | null
          is_active?: boolean
          created_by?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          token?: string
          created_at?: string
          expires_at?: string | null
          is_active?: boolean
          created_by?: string | null
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
      spiritual_journey_profiles: {
        Row: {
          id: string
          user_id: string
          total_xp: number
          current_level: number
          streak_weeks: number
          last_activity_date: string | null
          last_streak_week_start: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_xp?: number
          current_level?: number
          streak_weeks?: number
          last_activity_date?: string | null
          last_streak_week_start?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_xp?: number
          current_level?: number
          streak_weeks?: number
          last_activity_date?: string | null
          last_streak_week_start?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      spiritual_xp_events: {
        Row: {
          id: string
          user_id: string
          action_type: 'devotional' | 'prayer_register' | 'event_checkin' | 'reflection' | 'discipline'
          xp_amount: number
          reference_id: string | null
          reference_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action_type: 'devotional' | 'prayer_register' | 'event_checkin' | 'reflection' | 'discipline'
          xp_amount: number
          reference_id?: string | null
          reference_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action_type?: 'devotional' | 'prayer_register' | 'event_checkin' | 'reflection' | 'discipline'
          xp_amount?: number
          reference_id?: string | null
          reference_type?: string | null
          created_at?: string
        }
      }
      spiritual_disciplines: {
        Row: {
          id: string
          key: string
          title_pt: string
          category: 'daily' | 'weekly' | 'monthly'
          xp_amount: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          key: string
          title_pt: string
          category: 'daily' | 'weekly' | 'monthly'
          xp_amount?: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          key?: string
          title_pt?: string
          category?: 'daily' | 'weekly' | 'monthly'
          xp_amount?: number
          sort_order?: number
          created_at?: string
        }
      }
      spiritual_discipline_completions: {
        Row: {
          id: string
          user_id: string
          discipline_key: string
          completed_at: string
          xp_awarded: number
        }
        Insert: {
          id?: string
          user_id: string
          discipline_key: string
          completed_at?: string
          xp_awarded?: number
        }
        Update: {
          id?: string
          user_id?: string
          discipline_key?: string
          completed_at?: string
          xp_awarded?: number
        }
      }
      spiritual_reflections: {
        Row: {
          id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
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
      create_notification_for_user: {
        Args: {
          p_user_id: string
          p_type: 'event' | 'prayer' | 'achievement' | 'announcement' | 'reminder'
          p_title: string
          p_message: string
          p_action_url?: string | null
          p_is_read?: boolean
        }
        Returns: string
      }
      notify_users_with_role: {
        Args: {
          p_role: string
          p_type: 'event' | 'prayer' | 'achievement' | 'announcement' | 'reminder'
          p_title: string
          p_message: string
          p_action_url?: string | null
        }
        Returns: number
      }
      delete_devotional_admin: {
        Args: { p_id: string }
        Returns: undefined
      }
      get_devotional_completions_list: {
        Args: { days_back?: number }
        Returns: { id: string; name: string | null; avatar_url: string | null; completions_count: number }[]
      }
      get_active_youth_list: {
        Args: { days_back?: number }
        Returns: { id: string; name: string | null; avatar_url: string | null }[]
      }
      visitor_checkin_preview: {
        Args: { p_token: string }
        Returns: Json
      }
      visitor_checkin_submit: {
        Args: {
          p_token: string
          p_name: string
          p_is_first_time: boolean
          p_phone: string | null
          p_accepted_jesus: boolean
          p_congregates: boolean
          p_church_name: string | null
        }
        Returns: Json
      }
      visitor_checkin_invite_create: {
        Args: { p_event_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}