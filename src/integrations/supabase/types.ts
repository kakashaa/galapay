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
      admin_profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["request_status"] | null
          notes: string | null
          old_status: Database["public"]["Enums"]["request_status"] | null
          request_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["request_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["request_status"] | null
          request_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["request_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["request_status"] | null
          request_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "payout_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      available_banks: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          additional_info: Json | null
          bank_name: string
          bank_name_arabic: string
          country_code: string
          country_name_arabic: string
          created_at: string
          created_by: string | null
          display_order: number | null
          iban: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          additional_info?: Json | null
          bank_name: string
          bank_name_arabic: string
          country_code: string
          country_name_arabic: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          iban?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          additional_info?: Json | null
          bank_name?: string
          bank_name_arabic?: string
          country_code?: string
          country_name_arabic?: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          iban?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      ban_reports: {
        Row: {
          admin_notes: string | null
          ban_type: Database["public"]["Enums"]["ban_type"]
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          evidence_type: string
          evidence_url: string
          expires_at: string | null
          id: string
          is_verified: boolean | null
          processed_at: string | null
          processed_by: string | null
          reported_user_id: string
          reporter_gala_id: string
          reward_amount: number | null
          reward_paid: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          ban_type: Database["public"]["Enums"]["ban_type"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          evidence_type?: string
          evidence_url: string
          expires_at?: string | null
          id?: string
          is_verified?: boolean | null
          processed_at?: string | null
          processed_by?: string | null
          reported_user_id: string
          reporter_gala_id: string
          reward_amount?: number | null
          reward_paid?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          ban_type?: Database["public"]["Enums"]["ban_type"]
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          evidence_type?: string
          evidence_url?: string
          expires_at?: string | null
          id?: string
          is_verified?: boolean | null
          processed_at?: string | null
          processed_by?: string | null
          reported_user_id?: string
          reporter_gala_id?: string
          reward_amount?: number | null
          reward_paid?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_agency_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          message: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
        }
        Relationships: []
      }
      countries_methods: {
        Row: {
          country_code: string
          country_name_arabic: string
          created_at: string
          dial_code: string
          id: string
          is_active: boolean
          methods: Json
          updated_at: string
        }
        Insert: {
          country_code: string
          country_name_arabic: string
          created_at?: string
          dial_code: string
          id?: string
          is_active?: boolean
          methods?: Json
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_name_arabic?: string
          created_at?: string
          dial_code?: string
          id?: string
          is_active?: boolean
          methods?: Json
          updated_at?: string
        }
        Relationships: []
      }
      external_charging_links: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          name_arabic: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_arabic: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_arabic?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      hosts: {
        Row: {
          ai_praise_text: string | null
          avatar_url: string | null
          created_at: string
          handle: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          thank_you_text: string
          updated_at: string
        }
        Insert: {
          ai_praise_text?: string | null
          avatar_url?: string | null
          created_at?: string
          handle: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          thank_you_text?: string
          updated_at?: string
        }
        Update: {
          ai_praise_text?: string | null
          avatar_url?: string | null
          created_at?: string
          handle?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          thank_you_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      instant_payout_requests: {
        Row: {
          admin_final_receipt_url: string | null
          admin_notes: string | null
          ai_host_receipt_status: string | null
          ai_notes: string | null
          ai_supporter_receipt_status: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          host_account_id: string
          host_coins_amount: number
          host_country: string
          host_country_dial_code: string
          host_currency: string
          host_method_fields: Json | null
          host_name: string
          host_payout_amount: number
          host_payout_method: string
          host_phone_number: string
          host_receipt_reference: string
          host_receipt_url: string
          host_recipient_full_name: string
          id: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["instant_request_status"]
          supporter_account_id: string
          supporter_amount_usd: number
          supporter_bank_id: string | null
          supporter_name: string
          supporter_payment_method: string | null
          supporter_receipt_reference: string | null
          supporter_receipt_url: string
          tracking_code: string
          updated_at: string
        }
        Insert: {
          admin_final_receipt_url?: string | null
          admin_notes?: string | null
          ai_host_receipt_status?: string | null
          ai_notes?: string | null
          ai_supporter_receipt_status?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          host_account_id: string
          host_coins_amount: number
          host_country: string
          host_country_dial_code: string
          host_currency?: string
          host_method_fields?: Json | null
          host_name: string
          host_payout_amount: number
          host_payout_method: string
          host_phone_number: string
          host_receipt_reference: string
          host_receipt_url: string
          host_recipient_full_name: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["instant_request_status"]
          supporter_account_id: string
          supporter_amount_usd: number
          supporter_bank_id?: string | null
          supporter_name: string
          supporter_payment_method?: string | null
          supporter_receipt_reference?: string | null
          supporter_receipt_url: string
          tracking_code: string
          updated_at?: string
        }
        Update: {
          admin_final_receipt_url?: string | null
          admin_notes?: string | null
          ai_host_receipt_status?: string | null
          ai_notes?: string | null
          ai_supporter_receipt_status?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          host_account_id?: string
          host_coins_amount?: number
          host_country?: string
          host_country_dial_code?: string
          host_currency?: string
          host_method_fields?: Json | null
          host_name?: string
          host_payout_amount?: number
          host_payout_method?: string
          host_phone_number?: string
          host_receipt_reference?: string
          host_receipt_url?: string
          host_recipient_full_name?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["instant_request_status"]
          supporter_account_id?: string
          supporter_amount_usd?: number
          supporter_bank_id?: string | null
          supporter_name?: string
          supporter_payment_method?: string | null
          supporter_receipt_reference?: string | null
          supporter_receipt_url?: string
          tracking_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instant_payout_requests_supporter_bank_id_fkey"
            columns: ["supporter_bank_id"]
            isOneToOne: false
            referencedRelation: "available_banks"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          admin_final_receipt_image_url: string | null
          admin_notes: string | null
          agency_code: string | null
          ai_notes: string | null
          ai_receipt_status: string | null
          amount: number
          claimed_at: string | null
          claimed_by: string | null
          country: string
          country_dial_code: string
          created_at: string
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          method_fields: Json | null
          payout_method: string
          phone_number: string
          processed_at: string | null
          processed_by: string | null
          recipient_full_name: string
          reference_number: string | null
          rejection_reason: string | null
          reservation_reason: string | null
          status: Database["public"]["Enums"]["request_status"]
          tracking_code: string
          updated_at: string
          user_receipt_image_url: string
          zalal_life_account_id: string
          zalal_life_username: string | null
        }
        Insert: {
          admin_final_receipt_image_url?: string | null
          admin_notes?: string | null
          agency_code?: string | null
          ai_notes?: string | null
          ai_receipt_status?: string | null
          amount: number
          claimed_at?: string | null
          claimed_by?: string | null
          country: string
          country_dial_code: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          method_fields?: Json | null
          payout_method: string
          phone_number: string
          processed_at?: string | null
          processed_by?: string | null
          recipient_full_name: string
          reference_number?: string | null
          rejection_reason?: string | null
          reservation_reason?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          tracking_code: string
          updated_at?: string
          user_receipt_image_url: string
          zalal_life_account_id: string
          zalal_life_username?: string | null
        }
        Update: {
          admin_final_receipt_image_url?: string | null
          admin_notes?: string | null
          agency_code?: string | null
          ai_notes?: string | null
          ai_receipt_status?: string | null
          amount?: number
          claimed_at?: string | null
          claimed_by?: string | null
          country?: string
          country_dial_code?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          method_fields?: Json | null
          payout_method?: string
          phone_number?: string
          processed_at?: string | null
          processed_by?: string | null
          recipient_full_name?: string
          reference_number?: string | null
          rejection_reason?: string | null
          reservation_reason?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          tracking_code?: string
          updated_at?: string
          user_receipt_image_url?: string
          zalal_life_account_id?: string
          zalal_life_username?: string | null
        }
        Relationships: []
      }
      special_id_requests: {
        Row: {
          admin_notes: string | null
          ai_notes: string | null
          ai_verification_status: string | null
          ai_verified_level: number | null
          ban_expires_at: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          digit_length: number
          gala_user_id: string
          gala_username: string | null
          id: string
          pattern_code: string
          preferred_exact_id: string | null
          processed_at: string | null
          processed_by: string | null
          profile_screenshot_url: string
          rejection_reason: string | null
          status: string
          updated_at: string
          user_level: number
        }
        Insert: {
          admin_notes?: string | null
          ai_notes?: string | null
          ai_verification_status?: string | null
          ai_verified_level?: number | null
          ban_expires_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          digit_length: number
          gala_user_id: string
          gala_username?: string | null
          id?: string
          pattern_code: string
          preferred_exact_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          profile_screenshot_url: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_level: number
        }
        Update: {
          admin_notes?: string | null
          ai_notes?: string | null
          ai_verification_status?: string | null
          ai_verified_level?: number | null
          ban_expires_at?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          digit_length?: number
          gala_user_id?: string
          gala_username?: string | null
          id?: string
          pattern_code?: string
          preferred_exact_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          profile_screenshot_url?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_level?: number
        }
        Relationships: []
      }
      supporters: {
        Row: {
          ai_praise_text: string | null
          avatar_url: string | null
          created_at: string
          handle: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          thank_you_text: string
          updated_at: string
        }
        Insert: {
          ai_praise_text?: string | null
          avatar_url?: string | null
          created_at?: string
          handle: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          thank_you_text?: string
          updated_at?: string
        }
        Update: {
          ai_praise_text?: string | null
          avatar_url?: string | null
          created_at?: string
          handle?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          thank_you_text?: string
          updated_at?: string
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
      video_tutorials: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_tracking_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_staff: { Args: { _user_id: string }; Returns: boolean }
      is_reference_used: { Args: { ref_number: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff" | "user" | "super_admin"
      ban_type: "promotion" | "insult" | "defamation"
      instant_request_status:
        | "pending"
        | "processing"
        | "completed"
        | "rejected"
      request_status: "pending" | "review" | "paid" | "rejected" | "reserved"
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
      app_role: ["admin", "staff", "user", "super_admin"],
      ban_type: ["promotion", "insult", "defamation"],
      instant_request_status: [
        "pending",
        "processing",
        "completed",
        "rejected",
      ],
      request_status: ["pending", "review", "paid", "rejected", "reserved"],
    },
  },
} as const
