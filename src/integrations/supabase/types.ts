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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      consultations: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          payer_name: string | null
          payment_method: string
          plan: string
          reason: string | null
          reviewed_at: string | null
          screenshot_path: string | null
          status: Database["public"]["Enums"]["review_status"]
          transaction_ref: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          payer_name?: string | null
          payment_method: string
          plan: string
          reason?: string | null
          reviewed_at?: string | null
          screenshot_path?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          transaction_ref?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          payer_name?: string | null
          payment_method?: string
          plan?: string
          reason?: string | null
          reviewed_at?: string | null
          screenshot_path?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          transaction_ref?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      doctor_applications: {
        Row: {
          admin_note: string | null
          avatar_path: string | null
          bio: string | null
          certificate_path: string | null
          city: string | null
          consultation_fee: string | null
          created_at: string
          doctor_id: string
          education: string | null
          email: string | null
          experience_years: number
          full_name: string
          gender: string | null
          id: string
          languages: string | null
          license_number: string
          phone: string
          reviewed_at: string | null
          schedule: string | null
          specialty: string
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
          workplace: string | null
        }
        Insert: {
          admin_note?: string | null
          avatar_path?: string | null
          bio?: string | null
          certificate_path?: string | null
          city?: string | null
          consultation_fee?: string | null
          created_at?: string
          doctor_id: string
          education?: string | null
          email?: string | null
          experience_years?: number
          full_name: string
          gender?: string | null
          id?: string
          languages?: string | null
          license_number: string
          phone: string
          reviewed_at?: string | null
          schedule?: string | null
          specialty: string
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          workplace?: string | null
        }
        Update: {
          admin_note?: string | null
          avatar_path?: string | null
          bio?: string | null
          certificate_path?: string | null
          city?: string | null
          consultation_fee?: string | null
          created_at?: string
          doctor_id?: string
          education?: string | null
          email?: string | null
          experience_years?: number
          full_name?: string
          gender?: string | null
          id?: string
          languages?: string | null
          license_number?: string
          phone?: string
          reviewed_at?: string | null
          schedule?: string | null
          specialty?: string
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          workplace?: string | null
        }
        Relationships: []
      }
      doctor_ratings: {
        Row: {
          comment: string | null
          consultation_id: string
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          stars: number
          updated_at: string
        }
        Insert: {
          comment?: string | null
          consultation_id: string
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          stars: number
          updated_at?: string
        }
        Update: {
          comment?: string | null
          consultation_id?: string
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          stars?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_ratings_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_type: string | null
          consultation_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          consultation_id: string
          content?: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_type?: string | null
          consultation_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          doctor_id: string
          id: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["review_status"]
          telegram_username: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          doctor_id: string
          id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          telegram_username: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          doctor_id?: string
          id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          telegram_username?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      public_doctor_profiles: {
        Row: {
          application_id: string
          avatar_path: string | null
          bio: string | null
          city: string | null
          consultation_fee: string | null
          created_at: string
          doctor_id: string
          education: string | null
          experience_years: number
          full_name: string
          languages: string | null
          last_seen_at: string | null
          schedule: string | null
          specialty: string
          updated_at: string
          workplace: string | null
        }
        Insert: {
          application_id: string
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          consultation_fee?: string | null
          created_at?: string
          doctor_id: string
          education?: string | null
          experience_years?: number
          full_name: string
          languages?: string | null
          last_seen_at?: string | null
          schedule?: string | null
          specialty: string
          updated_at?: string
          workplace?: string | null
        }
        Update: {
          application_id?: string
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          consultation_fee?: string | null
          created_at?: string
          doctor_id?: string
          education?: string | null
          experience_years?: number
          full_name?: string
          languages?: string | null
          last_seen_at?: string | null
          schedule?: string | null
          specialty?: string
          updated_at?: string
          workplace?: string | null
        }
        Relationships: []
      }
      security_questions: {
        Row: {
          a1: string
          a2: string
          a3: string
          a4: string
          created_at: string
          email: string
          q1: string
          q2: string
          q3: string
          q4: string
          updated_at: string
          user_id: string
        }
        Insert: {
          a1: string
          a2: string
          a3: string
          a4: string
          created_at?: string
          email: string
          q1: string
          q2: string
          q3: string
          q4: string
          updated_at?: string
          user_id: string
        }
        Update: {
          a1?: string
          a2?: string
          a3?: string
          a4?: string
          created_at?: string
          email?: string
          q1?: string
          q2?: string
          q3?: string
          q4?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_consultation: {
        Args: { _consultation_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      shares_consultation: {
        Args: { _a: string; _b: string }
        Returns: boolean
      }
      touch_presence: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "doctor" | "patient"
      review_status: "pending" | "approved" | "declined"
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
    Enums: {
      app_role: ["admin", "doctor", "patient"],
      review_status: ["pending", "approved", "declined"],
    },
  },
} as const
