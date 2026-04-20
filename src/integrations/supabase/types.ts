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
      admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_subcategories: {
        Row: {
          categoria: string
          created_at: string
          id: string
          subcategoria: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          subcategoria: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          subcategoria?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          atracoes: string[]
          categoria: Database["public"]["Enums"]["event_category"]
          categorias: string[]
          cidade: string
          created_at: string
          data: string
          data_fim: string | null
          descricao: string
          endereco: string
          horario: string | null
          id: string
          imagem: string | null
          is_featured: boolean
          is_recurring: boolean
          latitude: number
          local: string
          longitude: number
          nome: string
          outdoor_duration: number
          outdoor_show_description: boolean
          outdoor_text_align: string
          outdoor_text_position: string
          outdoor_title_size: number
          recurring_days: string[]
          subcategorias: string[]
          subcategory_image_index: number | null
          updated_at: string
        }
        Insert: {
          atracoes?: string[]
          categoria?: Database["public"]["Enums"]["event_category"]
          categorias?: string[]
          cidade?: string
          created_at?: string
          data: string
          data_fim?: string | null
          descricao?: string
          endereco?: string
          horario?: string | null
          id?: string
          imagem?: string | null
          is_featured?: boolean
          is_recurring?: boolean
          latitude?: number
          local?: string
          longitude?: number
          nome: string
          outdoor_duration?: number
          outdoor_show_description?: boolean
          outdoor_text_align?: string
          outdoor_text_position?: string
          outdoor_title_size?: number
          recurring_days?: string[]
          subcategorias?: string[]
          subcategory_image_index?: number | null
          updated_at?: string
        }
        Update: {
          atracoes?: string[]
          categoria?: Database["public"]["Enums"]["event_category"]
          categorias?: string[]
          cidade?: string
          created_at?: string
          data?: string
          data_fim?: string | null
          descricao?: string
          endereco?: string
          horario?: string | null
          id?: string
          imagem?: string | null
          is_featured?: boolean
          is_recurring?: boolean
          latitude?: number
          local?: string
          longitude?: number
          nome?: string
          outdoor_duration?: number
          outdoor_show_description?: boolean
          outdoor_text_align?: string
          outdoor_text_position?: string
          outdoor_title_size?: number
          recurring_days?: string[]
          subcategorias?: string[]
          subcategory_image_index?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cidade: string | null
          created_at: string
          email: string | null
          favorite_event_ids: string[]
          full_name: string | null
          id: string
          interests: string[]
          receber_notificacoes: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          favorite_event_ids?: string[]
          full_name?: string | null
          id?: string
          interests?: string[]
          receber_notificacoes?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cidade?: string | null
          created_at?: string
          email?: string | null
          favorite_event_ids?: string[]
          full_name?: string | null
          id?: string
          interests?: string[]
          receber_notificacoes?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      removed_default_subcategories: {
        Row: {
          categoria: string
          created_at: string
          id: string
          subcategoria: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          subcategoria: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          subcategoria?: string
        }
        Relationships: []
      }
      subcategory_images: {
        Row: {
          categoria: string | null
          created_at: string
          id: string
          image_index: number
          image_url: string
          subcategory: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          id?: string
          image_index?: number
          image_url: string
          subcategory: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          id?: string
          image_index?: number
          image_url?: string
          subcategory?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      event_category:
        | "musica"
        | "esporte"
        | "teatro"
        | "alimentacao"
        | "palestras"
        | "feiras"
        | "empreendedorismo"
        | "entretenimento"
        | "festas"
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
      event_category: [
        "musica",
        "esporte",
        "teatro",
        "alimentacao",
        "palestras",
        "feiras",
        "empreendedorismo",
        "entretenimento",
        "festas",
      ],
    },
  },
} as const
