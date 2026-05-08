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
      ai_prompts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          prompt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          prompt: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      category_images: {
        Row: {
          categoria: string
          created_at: string
          id: string
          image_url: string
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          image_url: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      category_overrides: {
        Row: {
          color_vibrant: string | null
          created_at: string
          icon: string | null
          id: string
          key: string
          label: string | null
          updated_at: string
        }
        Insert: {
          color_vibrant?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          key: string
          label?: string | null
          updated_at?: string
        }
        Update: {
          color_vibrant?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          key?: string
          label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      custom_categories: {
        Row: {
          color_vibrant: string
          created_at: string
          icon: string
          id: string
          key: string
          label: string
          updated_at: string
        }
        Insert: {
          color_vibrant?: string
          created_at?: string
          icon?: string
          id?: string
          key: string
          label: string
          updated_at?: string
        }
        Update: {
          color_vibrant?: string
          created_at?: string
          icon?: string
          id?: string
          key?: string
          label?: string
          updated_at?: string
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
      duplicate_exceptions: {
        Row: {
          created_at: string
          created_by: string | null
          event_a_id: string
          event_b_id: string
          id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_a_id: string
          event_b_id: string
          id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_a_id?: string
          event_b_id?: string
          id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          atracoes: string[]
          categoria: string
          categorias: string[]
          cidade: string
          created_at: string
          custom_contacts: Json
          data: string
          data_fim: string | null
          descricao: string
          endereco: string
          horario: string | null
          id: string
          image_keyword: string | null
          image_source: string
          imagem: string | null
          is_featured: boolean
          is_recurring: boolean
          keyword_image_index: number | null
          keywords: string[]
          latitude: number
          local: string
          longitude: number
          nome: string
          outdoor_duration: number
          outdoor_image_position_x: number
          outdoor_image_position_y: number
          outdoor_image_zoom: number
          outdoor_show_description: boolean
          outdoor_show_info: boolean
          outdoor_text_align: string
          outdoor_text_position: string
          outdoor_title_size: number
          recurring_days: string[]
          subcategorias: string[]
          subcategory_image_index: number | null
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          atracoes?: string[]
          categoria?: string
          categorias?: string[]
          cidade?: string
          created_at?: string
          custom_contacts?: Json
          data: string
          data_fim?: string | null
          descricao?: string
          endereco?: string
          horario?: string | null
          id?: string
          image_keyword?: string | null
          image_source?: string
          imagem?: string | null
          is_featured?: boolean
          is_recurring?: boolean
          keyword_image_index?: number | null
          keywords?: string[]
          latitude?: number
          local?: string
          longitude?: number
          nome: string
          outdoor_duration?: number
          outdoor_image_position_x?: number
          outdoor_image_position_y?: number
          outdoor_image_zoom?: number
          outdoor_show_description?: boolean
          outdoor_show_info?: boolean
          outdoor_text_align?: string
          outdoor_text_position?: string
          outdoor_title_size?: number
          recurring_days?: string[]
          subcategorias?: string[]
          subcategory_image_index?: number | null
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          atracoes?: string[]
          categoria?: string
          categorias?: string[]
          cidade?: string
          created_at?: string
          custom_contacts?: Json
          data?: string
          data_fim?: string | null
          descricao?: string
          endereco?: string
          horario?: string | null
          id?: string
          image_keyword?: string | null
          image_source?: string
          imagem?: string | null
          is_featured?: boolean
          is_recurring?: boolean
          keyword_image_index?: number | null
          keywords?: string[]
          latitude?: number
          local?: string
          longitude?: number
          nome?: string
          outdoor_duration?: number
          outdoor_image_position_x?: number
          outdoor_image_position_y?: number
          outdoor_image_zoom?: number
          outdoor_show_description?: boolean
          outdoor_show_info?: boolean
          outdoor_text_align?: string
          outdoor_text_position?: string
          outdoor_title_size?: number
          recurring_days?: string[]
          subcategorias?: string[]
          subcategory_image_index?: number | null
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_images: {
        Row: {
          created_at: string
          id: string
          image_index: number
          image_url: string
          keyword: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_index?: number
          image_url: string
          keyword: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_index?: number
          image_url?: string
          keyword?: string
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
      removed_default_categories: {
        Row: {
          categoria: string
          created_at: string
          id: string
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
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
      subcategory_order: {
        Row: {
          categoria: string
          created_at: string
          hidden: boolean
          id: string
          position: number
          subcategoria: string
          tipo: string
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          hidden?: boolean
          id?: string
          position?: number
          subcategoria: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          hidden?: boolean
          id?: string
          position?: number
          subcategoria?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      venue_contacts: {
        Row: {
          created_at: string
          facebook: string | null
          id: string
          instagram: string | null
          nome: string | null
          updated_at: string
          venue_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          nome?: string | null
          updated_at?: string
          venue_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          facebook?: string | null
          id?: string
          instagram?: string | null
          nome?: string | null
          updated_at?: string
          venue_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_contacts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          cidade: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          id?: string
          nome?: string
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
      rename_subcategory: {
        Args: { p_categoria: string; p_new: string; p_old: string }
        Returns: undefined
      }
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
