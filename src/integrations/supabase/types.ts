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
      activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string
          entity_id: string | null
          entity_name: string | null
          full_name: string | null
          id: string
          user_id: string | null
          work_number: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity: string
          entity_id?: string | null
          entity_name?: string | null
          full_name?: string | null
          id?: string
          user_id?: string | null
          work_number?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string
          entity_id?: string | null
          entity_name?: string | null
          full_name?: string | null
          id?: string
          user_id?: string | null
          work_number?: string | null
        }
        Relationships: []
      }
      app_users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_blocked: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          work_number: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_blocked?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          work_number: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_blocked?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          work_number?: string
        }
        Relationships: []
      }
      circuits: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          attenuation_db: number | null
          cable_id: string | null
          created_at: string
          data_rate: string | null
          device_a: string | null
          device_b: string | null
          id: string
          installed_on: string | null
          name: string
          notes: string | null
          port_a_id: string
          port_b_id: string
          service_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          attenuation_db?: number | null
          cable_id?: string | null
          created_at?: string
          data_rate?: string | null
          device_a?: string | null
          device_b?: string | null
          id?: string
          installed_on?: string | null
          name: string
          notes?: string | null
          port_a_id: string
          port_b_id: string
          service_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          attenuation_db?: number | null
          cable_id?: string | null
          created_at?: string
          data_rate?: string | null
          device_a?: string | null
          device_b?: string | null
          id?: string
          installed_on?: string | null
          name?: string
          notes?: string | null
          port_a_id?: string
          port_b_id?: string
          service_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circuits_port_a_id_fkey"
            columns: ["port_a_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circuits_port_b_id_fkey"
            columns: ["port_b_id"]
            isOneToOne: false
            referencedRelation: "ports"
            referencedColumns: ["id"]
          },
        ]
      }
      data_rates: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      export_reminders: {
        Row: {
          app_user_id: string
          created_at: string
          id: string
          last_dismissed_at: string | null
          last_export_at: string | null
          updated_at: string
        }
        Insert: {
          app_user_id: string
          created_at?: string
          id?: string
          last_dismissed_at?: string | null
          last_export_at?: string | null
          updated_at?: string
        }
        Update: {
          app_user_id?: string
          created_at?: string
          id?: string
          last_dismissed_at?: string | null
          last_export_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_reminders_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      odfs: {
        Row: {
          created_at: string
          id: string
          mount_type: string
          name: string
          notes: string | null
          port_count: number
          ports_per_row: number
          site: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mount_type?: string
          name: string
          notes?: string | null
          port_count?: number
          ports_per_row?: number
          site?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mount_type?: string
          name?: string
          notes?: string | null
          port_count?: number
          ports_per_row?: number
          site?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ports: {
        Row: {
          adapter_type: string
          created_at: string
          id: string
          is_disabled: boolean
          label: string | null
          notes: string | null
          number: number
          odf_id: string
          status: string
        }
        Insert: {
          adapter_type?: string
          created_at?: string
          id?: string
          is_disabled?: boolean
          label?: string | null
          notes?: string | null
          number: number
          odf_id: string
          status?: string
        }
        Update: {
          adapter_type?: string
          created_at?: string
          id?: string
          is_disabled?: boolean
          label?: string | null
          notes?: string | null
          number?: number
          odf_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ports_odf_id_fkey"
            columns: ["odf_id"]
            isOneToOne: false
            referencedRelation: "odfs"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "manager" | "engineer" | "technician"
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
      app_role: ["manager", "engineer", "technician"],
    },
  },
} as const
