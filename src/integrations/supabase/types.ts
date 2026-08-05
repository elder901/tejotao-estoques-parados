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
      action_plans: {
        Row: {
          cod_item: string
          cod_unidade: string
          created_at: string
          estrategia: string
          id: string
          observacoes: string | null
          prazo: string | null
          responsavel: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cod_item: string
          cod_unidade: string
          created_at?: string
          estrategia: string
          id?: string
          observacoes?: string | null
          prazo?: string | null
          responsavel: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cod_item?: string
          cod_unidade?: string
          created_at?: string
          estrategia?: string
          id?: string
          observacoes?: string | null
          prazo?: string | null
          responsavel?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_agente_metricas: {
        Row: {
          agente_id: string
          created_at: string
          id: string
          metrica_id: string
          ordem: number
        }
        Insert: {
          agente_id: string
          created_at?: string
          id?: string
          metrica_id: string
          ordem?: number
        }
        Update: {
          agente_id?: string
          created_at?: string
          id?: string
          metrica_id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_agente_metricas_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "ai_agentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agente_metricas_metrica_id_fkey"
            columns: ["metrica_id"]
            isOneToOne: false
            referencedRelation: "ai_metricas"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agente_skills: {
        Row: {
          agente_id: string
          ativa: boolean
          conteudo: string
          created_at: string
          id: string
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          agente_id: string
          ativa?: boolean
          conteudo?: string
          created_at?: string
          id?: string
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          agente_id?: string
          ativa?: boolean
          conteudo?: string
          created_at?: string
          id?: string
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agente_skills_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "ai_agentes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agente_versoes: {
        Row: {
          agente_id: string
          created_at: string
          criado_por: string | null
          id: string
          motivo: string
          snapshot: Json
        }
        Insert: {
          agente_id: string
          created_at?: string
          criado_por?: string | null
          id?: string
          motivo?: string
          snapshot: Json
        }
        Update: {
          agente_id?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          motivo?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_agente_versoes_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "ai_agentes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agentes: {
        Row: {
          ativo: boolean
          avatar: string
          created_at: string
          descricao: string
          id: string
          instrucoes: string
          modelo: string
          nome: string
          permite_erp: boolean
          slug: string
          temperatura: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar?: string
          created_at?: string
          descricao?: string
          id?: string
          instrucoes?: string
          modelo?: string
          nome: string
          permite_erp?: boolean
          slug: string
          temperatura?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar?: string
          created_at?: string
          descricao?: string
          id?: string
          instrucoes?: string
          modelo?: string
          nome?: string
          permite_erp?: boolean
          slug?: string
          temperatura?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_metrica_versoes: {
        Row: {
          created_at: string
          criado_por: string | null
          id: string
          metrica_id: string
          motivo: string
          snapshot: Json
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          id?: string
          metrica_id: string
          motivo?: string
          snapshot: Json
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          id?: string
          metrica_id?: string
          motivo?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_metrica_versoes_metrica_id_fkey"
            columns: ["metrica_id"]
            isOneToOne: false
            referencedRelation: "ai_metricas"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_metricas: {
        Row: {
          area: string
          ativa: boolean
          chave: string
          created_at: string
          definicao: string
          id: string
          nome: string
          ordem: number
          regra_tecnica: string
          updated_at: string
        }
        Insert: {
          area?: string
          ativa?: boolean
          chave: string
          created_at?: string
          definicao?: string
          id?: string
          nome: string
          ordem?: number
          regra_tecnica?: string
          updated_at?: string
        }
        Update: {
          area?: string
          ativa?: boolean
          chave?: string
          created_at?: string
          definicao?: string
          id?: string
          nome?: string
          ordem?: number
          regra_tecnica?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_threads: {
        Row: {
          analista: string
          created_at: string
          id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analista?: string
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analista?: string
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      csv_uploads: {
        Row: {
          file_name: string
          id: string
          periodo_referencia: string
          storage_path: string
          unit_code: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          id?: string
          periodo_referencia: string
          storage_path: string
          unit_code: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          id?: string
          periodo_referencia?: string
          storage_path?: string
          unit_code?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      erp_curva_abc: {
        Row: {
          cod_departamento: string
          cod_item: string
          cod_unidade: string
          created_at: string
          curva: string
          data_referencia: string
          departamento: string
          descricao: string
          dias_periodo: number
          fornecedor: string
          id: string
          participacao: number
          participacao_acumulada: number
          posicao: number
          quantidade_venda: number
          sync_id: string | null
          valor_venda: number
        }
        Insert: {
          cod_departamento?: string
          cod_item: string
          cod_unidade: string
          created_at?: string
          curva?: string
          data_referencia?: string
          departamento?: string
          descricao?: string
          dias_periodo?: number
          fornecedor?: string
          id?: string
          participacao?: number
          participacao_acumulada?: number
          posicao?: number
          quantidade_venda?: number
          sync_id?: string | null
          valor_venda?: number
        }
        Update: {
          cod_departamento?: string
          cod_item?: string
          cod_unidade?: string
          created_at?: string
          curva?: string
          data_referencia?: string
          departamento?: string
          descricao?: string
          dias_periodo?: number
          fornecedor?: string
          id?: string
          participacao?: number
          participacao_acumulada?: number
          posicao?: number
          quantidade_venda?: number
          sync_id?: string | null
          valor_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "erp_curva_abc_sync_id_fkey"
            columns: ["sync_id"]
            isOneToOne: false
            referencedRelation: "erp_sync_log"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_estoque_snapshot: {
        Row: {
          cod_departamento: string
          cod_item: string
          cod_unidade: string
          created_at: string
          custo_medio: number
          data_referencia: string
          departamento: string
          descricao: string
          dias_estoque: number
          dias_periodo: number
          fornecedor: string
          id: string
          quantidade_estoque: number
          regra_versao: number
          sem_giro: boolean
          sync_id: string | null
          valor_estoque: number
          vendas_periodo: number
          vmd: number
        }
        Insert: {
          cod_departamento?: string
          cod_item: string
          cod_unidade: string
          created_at?: string
          custo_medio?: number
          data_referencia?: string
          departamento?: string
          descricao?: string
          dias_estoque?: number
          dias_periodo?: number
          fornecedor?: string
          id?: string
          quantidade_estoque?: number
          regra_versao?: number
          sem_giro?: boolean
          sync_id?: string | null
          valor_estoque?: number
          vendas_periodo?: number
          vmd?: number
        }
        Update: {
          cod_departamento?: string
          cod_item?: string
          cod_unidade?: string
          created_at?: string
          custo_medio?: number
          data_referencia?: string
          departamento?: string
          descricao?: string
          dias_estoque?: number
          dias_periodo?: number
          fornecedor?: string
          id?: string
          quantidade_estoque?: number
          regra_versao?: number
          sem_giro?: boolean
          sync_id?: string | null
          valor_estoque?: number
          vendas_periodo?: number
          vmd?: number
        }
        Relationships: [
          {
            foreignKeyName: "erp_estoque_snapshot_sync_id_fkey"
            columns: ["sync_id"]
            isOneToOne: false
            referencedRelation: "erp_sync_log"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_indicadores_mensal: {
        Row: {
          ano_mes: string
          atualizado_em: string
          cod_unidade: string
          cupons: number
          custo: number
          dias: number
          faturamento: number
          id: string
          itens: number
        }
        Insert: {
          ano_mes: string
          atualizado_em?: string
          cod_unidade: string
          cupons?: number
          custo?: number
          dias?: number
          faturamento?: number
          id?: string
          itens?: number
        }
        Update: {
          ano_mes?: string
          atualizado_em?: string
          cod_unidade?: string
          cupons?: number
          custo?: number
          dias?: number
          faturamento?: number
          id?: string
          itens?: number
        }
        Relationships: []
      }
      erp_mcp_connection: {
        Row: {
          access_token: string | null
          client_id: string | null
          client_secret: string | null
          code_verifier: string | null
          created_at: string
          expires_at: string | null
          id: string
          issuer: string | null
          last_error: string | null
          owner_id: string
          redirect_uri: string | null
          refresh_token: string | null
          server_url: string
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          code_verifier?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          issuer?: string | null
          last_error?: string | null
          owner_id: string
          redirect_uri?: string | null
          refresh_token?: string | null
          server_url: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          code_verifier?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          issuer?: string | null
          last_error?: string | null
          owner_id?: string
          redirect_uri?: string | null
          refresh_token?: string | null
          server_url?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      erp_ruptura_snapshot: {
        Row: {
          cod_departamento: string
          cod_item: string
          cod_unidade: string
          created_at: string
          custo_medio: number
          data_referencia: string
          departamento: string
          descricao: string
          dias_periodo: number
          fornecedor: string
          id: string
          perda_dia: number
          preco_venda: number
          quantidade_estoque: number
          regra_versao: number
          sync_id: string | null
          vendas_periodo: number
          vmd: number
        }
        Insert: {
          cod_departamento?: string
          cod_item: string
          cod_unidade: string
          created_at?: string
          custo_medio?: number
          data_referencia?: string
          departamento?: string
          descricao?: string
          dias_periodo?: number
          fornecedor?: string
          id?: string
          perda_dia?: number
          preco_venda?: number
          quantidade_estoque?: number
          regra_versao?: number
          sync_id?: string | null
          vendas_periodo?: number
          vmd?: number
        }
        Update: {
          cod_departamento?: string
          cod_item?: string
          cod_unidade?: string
          created_at?: string
          custo_medio?: number
          data_referencia?: string
          departamento?: string
          descricao?: string
          dias_periodo?: number
          fornecedor?: string
          id?: string
          perda_dia?: number
          preco_venda?: number
          quantidade_estoque?: number
          regra_versao?: number
          sync_id?: string | null
          vendas_periodo?: number
          vmd?: number
        }
        Relationships: []
      }
      erp_ruptura_totais: {
        Row: {
          cod_unidade: string
          created_at: string
          data_referencia: string
          id: string
          itens_ativos: number
          itens_negativos: number
          itens_zerados: number
          sync_id: string | null
          updated_at: string
        }
        Insert: {
          cod_unidade: string
          created_at?: string
          data_referencia?: string
          id?: string
          itens_ativos?: number
          itens_negativos?: number
          itens_zerados?: number
          sync_id?: string | null
          updated_at?: string
        }
        Update: {
          cod_unidade?: string
          created_at?: string
          data_referencia?: string
          id?: string
          itens_ativos?: number
          itens_negativos?: number
          itens_zerados?: number
          sync_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_ruptura_totais_sync_id_fkey"
            columns: ["sync_id"]
            isOneToOne: false
            referencedRelation: "erp_sync_log"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_ruptura_totais_detalhe: {
        Row: {
          cod_departamento: string
          cod_unidade: string
          created_at: string
          data_referencia: string
          departamento: string
          id: string
          itens_ativos: number
          itens_negativos: number
          itens_zerados: number
          sync_id: string | null
          updated_at: string
        }
        Insert: {
          cod_departamento?: string
          cod_unidade: string
          created_at?: string
          data_referencia?: string
          departamento?: string
          id?: string
          itens_ativos?: number
          itens_negativos?: number
          itens_zerados?: number
          sync_id?: string | null
          updated_at?: string
        }
        Update: {
          cod_departamento?: string
          cod_unidade?: string
          created_at?: string
          data_referencia?: string
          departamento?: string
          id?: string
          itens_ativos?: number
          itens_negativos?: number
          itens_zerados?: number
          sync_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_ruptura_totais_detalhe_sync_id_fkey"
            columns: ["sync_id"]
            isOneToOne: false
            referencedRelation: "erp_sync_log"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_sync_log: {
        Row: {
          created_at: string
          disparado_por: string | null
          erro: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          linhas: number
          regra_versao: number | null
          status: string
        }
        Insert: {
          created_at?: string
          disparado_por?: string | null
          erro?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          linhas?: number
          regra_versao?: number | null
          status?: string
        }
        Update: {
          created_at?: string
          disparado_por?: string | null
          erro?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          linhas?: number
          regra_versao?: number | null
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          is_admin?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          name?: string
        }
        Relationships: []
      }
      regras_versoes: {
        Row: {
          ativa: boolean
          created_at: string
          criado_por: string | null
          id: string
          motivo: string
          parametros: Json
          versao: number
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          criado_por?: string | null
          id?: string
          motivo?: string
          parametros: Json
          versao: number
        }
        Update: {
          ativa?: boolean
          created_at?: string
          criado_por?: string | null
          id?: string
          motivo?: string
          parametros?: Json
          versao?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      curva_abc_departamentos: {
        Args: { p_unidade?: string }
        Returns: {
          departamento: string
          itens: number
          valor: number
        }[]
      }
      curva_abc_resumo: {
        Args: { p_departamento?: string; p_unidade?: string }
        Returns: {
          curva: string
          itens: number
          valor: number
        }[]
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
