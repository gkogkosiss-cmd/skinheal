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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_coach_messages: {
        Row: {
          analysis_id: string | null
          created_at: string
          id: string
          message_text: string
          role: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          id?: string
          message_text: string
          role: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          id?: string
          message_text?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_coach_messages_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analysis_records"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          biological_explanation: string | null
          conditions: Json | null
          created_at: string
          diagnostic_answers: Json | null
          healing_protocol: Json | null
          id: string
          image_url: string | null
          root_causes: Json | null
          user_id: string
          visual_features: Json | null
        }
        Insert: {
          biological_explanation?: string | null
          conditions?: Json | null
          created_at?: string
          diagnostic_answers?: Json | null
          healing_protocol?: Json | null
          id?: string
          image_url?: string | null
          root_causes?: Json | null
          user_id: string
          visual_features?: Json | null
        }
        Update: {
          biological_explanation?: string | null
          conditions?: Json | null
          created_at?: string
          diagnostic_answers?: Json | null
          healing_protocol?: Json | null
          id?: string
          image_url?: string | null
          root_causes?: Json | null
          user_id?: string
          visual_features?: Json | null
        }
        Relationships: []
      }
      analysis_records: {
        Row: {
          answers: Json
          body_area: string | null
          created_at: string
          daily_plan: Json
          gut_health_plan: Json
          healing_protocol: Json
          id: string
          image_observations: Json
          lifestyle_plan: Json
          nutrition_plan: Json
          photo_url: string | null
          photo_urls: Json
          results: Json
          root_causes: Json
          safety_flags: Json
          skin_score: Json
          user_id: string
        }
        Insert: {
          answers?: Json
          body_area?: string | null
          created_at?: string
          daily_plan?: Json
          gut_health_plan?: Json
          healing_protocol?: Json
          id?: string
          image_observations?: Json
          lifestyle_plan?: Json
          nutrition_plan?: Json
          photo_url?: string | null
          photo_urls?: Json
          results?: Json
          root_causes?: Json
          safety_flags?: Json
          skin_score?: Json
          user_id: string
        }
        Update: {
          answers?: Json
          body_area?: string | null
          created_at?: string
          daily_plan?: Json
          gut_health_plan?: Json
          healing_protocol?: Json
          id?: string
          image_observations?: Json
          lifestyle_plan?: Json
          nutrition_plan?: Json
          photo_url?: string | null
          photo_urls?: Json
          results?: Json
          root_causes?: Json
          safety_flags?: Json
          skin_score?: Json
          user_id?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          analysis_id: string | null
          completed: boolean
          created_at: string
          date: string
          id: string
          task_name: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          task_name: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          task_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analysis_records"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age_range: string | null
          created_at: string
          id: string
          name: string | null
          profile_photo_url: string | null
          skin_concern: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_range?: string | null
          created_at?: string
          id?: string
          name?: string | null
          profile_photo_url?: string | null
          skin_concern?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_range?: string | null
          created_at?: string
          id?: string
          name?: string | null
          profile_photo_url?: string | null
          skin_concern?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          analysis_id: string | null
          body_area: string | null
          created_at: string
          date_uploaded: string
          id: string
          photo_url: string
          progress_summary: Json
          score_estimate: number | null
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          body_area?: string | null
          created_at?: string
          date_uploaded?: string
          id?: string
          photo_url: string
          progress_summary?: Json
          score_estimate?: number | null
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          body_area?: string | null
          created_at?: string
          date_uploaded?: string
          id?: string
          photo_url?: string
          progress_summary?: Json
          score_estimate?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_photos_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analysis_records"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          analysis_id: string | null
          context: string
          created_at: string
          feedback_text: string | null
          helpful: boolean | null
          id: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          context?: string
          created_at?: string
          feedback_text?: string | null
          helpful?: boolean | null
          id?: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          context?: string
          created_at?: string
          feedback_text?: string | null
          helpful?: boolean | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analysis_records"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          daily_plan_reminder: boolean
          meal_reminder: boolean
          updated_at: string
          user_id: string
          weekly_check_reminder: boolean
        }
        Insert: {
          daily_plan_reminder?: boolean
          meal_reminder?: boolean
          updated_at?: string
          user_id: string
          weekly_check_reminder?: boolean
        }
        Update: {
          daily_plan_reminder?: boolean
          meal_reminder?: boolean
          updated_at?: string
          user_id?: string
          weekly_check_reminder?: boolean
        }
        Relationships: []
      }
      user_state: {
        Row: {
          latest_analysis_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          latest_analysis_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          latest_analysis_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_state_latest_analysis_id_fkey"
            columns: ["latest_analysis_id"]
            isOneToOne: false
            referencedRelation: "analysis_records"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
