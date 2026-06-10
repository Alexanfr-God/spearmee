export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_baby_results: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          match_id: string
          requested_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          match_id: string
          requested_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          match_id?: string
          requested_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_baby_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_baby_results_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          body_markdown: string | null
          cover_image: string | null
          id: string
          lang: string | null
          published_at: string | null
          title: string
        }
        Insert: {
          body_markdown?: string | null
          cover_image?: string | null
          id?: string
          lang?: string | null
          published_at?: string | null
          title: string
        }
        Update: {
          body_markdown?: string | null
          cover_image?: string | null
          id?: string
          lang?: string | null
          published_at?: string | null
          title?: string
        }
        Relationships: []
      }
      daily_sets: {
        Row: {
          candidate_ids: string[]
          created_at: string
          id: string
          profile_id: string
          seen_ids: string[]
          set_date: string
          updated_at: string
        }
        Insert: {
          candidate_ids?: string[]
          created_at?: string
          id?: string
          profile_id: string
          seen_ids?: string[]
          set_date?: string
          updated_at?: string
        }
        Update: {
          candidate_ids?: string[]
          created_at?: string
          id?: string
          profile_id?: string
          seen_ids?: string[]
          set_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_sets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string | null
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_translations: {
        Row: {
          created_at: string
          id: string
          lang: string
          message_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          lang: string
          message_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          lang?: string
          message_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_translations_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          match_id: string
          original_lang: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          match_id: string
          original_lang?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          match_id?: string
          original_lang?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string | null
          id: string
          position: number | null
          profile_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          position?: number | null
          profile_id: string
          storage_path: string
        }
        Update: {
          created_at?: string | null
          id?: string
          position?: number | null
          profile_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      points_ledger: {
        Row: {
          action: string
          created_at: string
          dedupe_key: string | null
          id: string
          points: number
          profile_id: string
        }
        Insert: {
          action: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          points: number
          profile_id: string
        }
        Update: {
          action?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          points?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          age_max: number | null
          age_min: number | null
          children_timeline: string[] | null
          created_at: string
          dealbreakers: string[] | null
          distance_km: number | null
          drinking: string[] | null
          education: string[] | null
          ethnicity: string[] | null
          eye_color: string[] | null
          hair_color: string[] | null
          height_max: number | null
          height_min: number | null
          id: string
          profile_id: string
          relationship_goal: string[] | null
          religion: string[] | null
          smoking: string[] | null
          updated_at: string
          wants_children: string[] | null
          willing_to_relocate: string | null
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          children_timeline?: string[] | null
          created_at?: string
          dealbreakers?: string[] | null
          distance_km?: number | null
          drinking?: string[] | null
          education?: string[] | null
          ethnicity?: string[] | null
          eye_color?: string[] | null
          hair_color?: string[] | null
          height_max?: number | null
          height_min?: number | null
          id?: string
          profile_id: string
          relationship_goal?: string[] | null
          religion?: string[] | null
          smoking?: string[] | null
          updated_at?: string
          wants_children?: string[] | null
          willing_to_relocate?: string | null
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          children_timeline?: string[] | null
          created_at?: string
          dealbreakers?: string[] | null
          distance_km?: number | null
          drinking?: string[] | null
          education?: string[] | null
          ethnicity?: string[] | null
          eye_color?: string[] | null
          hair_color?: string[] | null
          height_max?: number | null
          height_min?: number | null
          id?: string
          profile_id?: string
          relationship_goal?: string[] | null
          religion?: string[] | null
          smoking?: string[] | null
          updated_at?: string
          wants_children?: string[] | null
          willing_to_relocate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_intent_events: {
        Row: {
          context: Json | null
          created_at: string | null
          event_type: string
          id: string
          profile_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          event_type: string
          id?: string
          profile_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          event_type?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_intent_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          birth_date: string | null
          body_type: string | null
          children_timeline: string | null
          city: string | null
          country: string | null
          created_at: string | null
          diet: string | null
          display_name: string | null
          drinking: string | null
          education: string | null
          ethnicity: string | null
          exercise: string | null
          eye_color: string | null
          gender: string | null
          hair_color: string | null
          hair_type: string | null
          has_children: string | null
          height_cm: number | null
          id: string
          is_premium: boolean | null
          language_code: string | null
          last_active: string | null
          last_streak_date: string | null
          lat: number | null
          lng: number | null
          looking_for: string | null
          native_languages: string[] | null
          onboarded: boolean | null
          prompt_answer: string | null
          relationship_goal: string | null
          religion: string | null
          smoking: string | null
          streak_count: number
          telegram_id: number
          username: string | null
          verified: boolean
          verified_at: string | null
          wants_children: string | null
          wants_marriage: string | null
          weight_kg: number | null
          willing_to_relocate: string | null
        }
        Insert: {
          bio?: string | null
          birth_date?: string | null
          body_type?: string | null
          children_timeline?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          diet?: string | null
          display_name?: string | null
          drinking?: string | null
          education?: string | null
          ethnicity?: string | null
          exercise?: string | null
          eye_color?: string | null
          gender?: string | null
          hair_color?: string | null
          hair_type?: string | null
          has_children?: string | null
          height_cm?: number | null
          id: string
          is_premium?: boolean | null
          language_code?: string | null
          last_active?: string | null
          last_streak_date?: string | null
          lat?: number | null
          lng?: number | null
          looking_for?: string | null
          native_languages?: string[] | null
          onboarded?: boolean | null
          prompt_answer?: string | null
          relationship_goal?: string | null
          religion?: string | null
          smoking?: string | null
          streak_count?: number
          telegram_id: number
          username?: string | null
          verified?: boolean
          verified_at?: string | null
          wants_children?: string | null
          wants_marriage?: string | null
          weight_kg?: number | null
          willing_to_relocate?: string | null
        }
        Update: {
          bio?: string | null
          birth_date?: string | null
          body_type?: string | null
          children_timeline?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          diet?: string | null
          display_name?: string | null
          drinking?: string | null
          education?: string | null
          ethnicity?: string | null
          exercise?: string | null
          eye_color?: string | null
          gender?: string | null
          hair_color?: string | null
          hair_type?: string | null
          has_children?: string | null
          height_cm?: number | null
          id?: string
          is_premium?: boolean | null
          language_code?: string | null
          last_active?: string | null
          last_streak_date?: string | null
          lat?: number | null
          lng?: number | null
          looking_for?: string | null
          native_languages?: string[] | null
          onboarded?: boolean | null
          prompt_answer?: string | null
          relationship_goal?: string | null
          religion?: string | null
          smoking?: string | null
          streak_count?: number
          telegram_id?: number
          username?: string | null
          verified?: boolean
          verified_at?: string | null
          wants_children?: string | null
          wants_marriage?: string | null
          weight_kg?: number | null
          willing_to_relocate?: string | null
        }
        Relationships: []
      }
      swipes: {
        Row: {
          action: string
          created_at: string | null
          id: string
          swiper_id: string
          target_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          swiper_id: string
          target_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          swiper_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_swiper_id_fkey"
            columns: ["swiper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_match_member: {
        Args: { _match_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
