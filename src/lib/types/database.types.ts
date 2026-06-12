export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PerfilRole = 'admin' | 'parceiro'
export type TransacaoTipo = 'credito' | 'debito' | 'ajuste' | 'resgate'
export type CupomStatus = 'disponivel' | 'resgatado' | 'expirado' | 'cancelado'
export type CupomBeneficioTipo = 'desconto_percentual' | 'desconto_valor' | 'produto_gratis' | 'outro'
export type DisparoCanal = 'whatsapp' | 'email' | 'sms' | 'push'
export type DisparoStatus = 'rascunho' | 'agendado' | 'enviando' | 'enviado' | 'cancelado'
export type MensalidadeStatus = 'pendente' | 'pago' | 'atrasado' | 'cancelado'

export interface Database {
  public: {
    Tables: {
      parceiros: {
        Row: {
          id: string
          nome: string
          razao_social: string | null
          cnpj: string | null
          categoria: string | null
          telefone: string | null
          email: string | null
          endereco: string | null
          cidade: string | null
          estado: string | null
          logo_url: string | null
          cor_destaque: string | null
          taxa_conversao_pontos: number
          teto_pontos_mensal: number | null
          whatsapp: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          razao_social?: string | null
          cnpj?: string | null
          categoria?: string | null
          telefone?: string | null
          email?: string | null
          endereco?: string | null
          cidade?: string | null
          estado?: string | null
          logo_url?: string | null
          cor_destaque?: string | null
          taxa_conversao_pontos?: number
          teto_pontos_mensal?: number | null
          whatsapp?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['parceiros']['Insert']>
        Relationships: []
      }
      perfis: {
        Row: {
          id: string
          nome: string
          email: string
          role: PerfilRole
          parceiro_id: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id: string
          nome: string
          email: string
          role: PerfilRole
          parceiro_id?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['perfis']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'perfis_parceiro_id_fkey'
            columns: ['parceiro_id']
            isOneToOne: false
            referencedRelation: 'parceiros'
            referencedColumns: ['id']
          },
        ]
      }
      atendentes: {
        Row: {
          id: string
          parceiro_id: string
          nome: string
          pin_hash: string
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          parceiro_id: string
          nome: string
          pin_hash: string
          ativo?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['atendentes']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'atendentes_parceiro_id_fkey'
            columns: ['parceiro_id']
            isOneToOne: false
            referencedRelation: 'parceiros'
            referencedColumns: ['id']
          },
        ]
      }
      membros: {
        Row: {
          id: string
          nome: string
          cpf: string | null
          email: string | null
          telefone: string
          data_nascimento: string | null
          pontos_saldo: number
          pontos_acumulados_total: number
          nivel: string
          ativo: boolean
          origem_parceiro_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cpf?: string | null
          email?: string | null
          telefone: string
          data_nascimento?: string | null
          pontos_saldo?: number
          pontos_acumulados_total?: number
          nivel?: string
          ativo?: boolean
          origem_parceiro_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['membros']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'membros_origem_parceiro_id_fkey'
            columns: ['origem_parceiro_id']
            isOneToOne: false
            referencedRelation: 'parceiros'
            referencedColumns: ['id']
          },
        ]
      }
      cupom_niveis: {
        Row: {
          id: string
          parceiro_id: string | null
          nome: string
          descricao: string | null
          pontos_necessarios: number
          tipo_beneficio: CupomBeneficioTipo
          valor_beneficio: number | null
          validade_dias: number
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          parceiro_id?: string | null
          nome: string
          descricao?: string | null
          pontos_necessarios: number
          tipo_beneficio: CupomBeneficioTipo
          valor_beneficio?: number | null
          validade_dias?: number
          ativo?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['cupom_niveis']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'cupom_niveis_parceiro_id_fkey'
            columns: ['parceiro_id']
            isOneToOne: false
            referencedRelation: 'parceiros'
            referencedColumns: ['id']
          },
        ]
      }
      cupons: {
        Row: {
          id: string
          membro_id: string
          cupom_nivel_id: string
          parceiro_id: string | null
          codigo: string
          status: CupomStatus
          pontos_utilizados: number
          data_emissao: string
          data_validade: string
          data_resgate: string | null
          resgatado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          membro_id: string
          cupom_nivel_id: string
          parceiro_id?: string | null
          codigo: string
          status?: CupomStatus
          pontos_utilizados: number
          data_emissao?: string
          data_validade: string
          data_resgate?: string | null
          resgatado_por?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['cupons']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'cupons_membro_id_fkey'
            columns: ['membro_id']
            isOneToOne: false
            referencedRelation: 'membros'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cupons_cupom_nivel_id_fkey'
            columns: ['cupom_nivel_id']
            isOneToOne: false
            referencedRelation: 'cupom_niveis'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cupons_parceiro_id_fkey'
            columns: ['parceiro_id']
            isOneToOne: false
            referencedRelation: 'parceiros'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cupons_resgatado_por_fkey'
            columns: ['resgatado_por']
            isOneToOne: false
            referencedRelation: 'atendentes'
            referencedColumns: ['id']
          },
        ]
      }
      transacoes: {
        Row: {
          id: string
          membro_id: string
          parceiro_id: string
          atendente_id: string | null
          tipo: TransacaoTipo
          valor_compra: number | null
          pontos: number
          descricao: string | null
          cupom_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          membro_id: string
          parceiro_id: string
          atendente_id?: string | null
          tipo: TransacaoTipo
          valor_compra?: number | null
          pontos: number
          descricao?: string | null
          cupom_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['transacoes']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'transacoes_membro_id_fkey'
            columns: ['membro_id']
            isOneToOne: false
            referencedRelation: 'membros'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transacoes_parceiro_id_fkey'
            columns: ['parceiro_id']
            isOneToOne: false
            referencedRelation: 'parceiros'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transacoes_atendente_id_fkey'
            columns: ['atendente_id']
            isOneToOne: false
            referencedRelation: 'atendentes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transacoes_cupom_id_fkey'
            columns: ['cupom_id']
            isOneToOne: false
            referencedRelation: 'cupons'
            referencedColumns: ['id']
          },
        ]
      }
      disparos: {
        Row: {
          id: string
          parceiro_id: string | null
          titulo: string
          canal: DisparoCanal
          segmento: Json
          mensagem: string
          status: DisparoStatus
          agendado_para: string | null
          enviado_em: string | null
          total_destinatarios: number
          total_enviados: number
          criado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          parceiro_id?: string | null
          titulo: string
          canal: DisparoCanal
          segmento?: Json
          mensagem: string
          status?: DisparoStatus
          agendado_para?: string | null
          enviado_em?: string | null
          total_destinatarios?: number
          total_enviados?: number
          criado_por?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['disparos']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'disparos_parceiro_id_fkey'
            columns: ['parceiro_id']
            isOneToOne: false
            referencedRelation: 'parceiros'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'disparos_criado_por_fkey'
            columns: ['criado_por']
            isOneToOne: false
            referencedRelation: 'perfis'
            referencedColumns: ['id']
          },
        ]
      }
      cupom_nivel_parceiros: {
        Row: {
          cupom_nivel_id: string
          parceiro_id: string
        }
        Insert: {
          cupom_nivel_id: string
          parceiro_id: string
        }
        Update: Partial<Database['public']['Tables']['cupom_nivel_parceiros']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'cupom_nivel_parceiros_cupom_nivel_id_fkey'
            columns: ['cupom_nivel_id']
            isOneToOne: false
            referencedRelation: 'cupom_niveis'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cupom_nivel_parceiros_parceiro_id_fkey'
            columns: ['parceiro_id']
            isOneToOne: false
            referencedRelation: 'parceiros'
            referencedColumns: ['id']
          },
        ]
      }
      planos: {
        Row: {
          id: string
          nome: string
          valor_mensal: number
          descricao: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          valor_mensal: number
          descricao?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['planos']['Insert']>
        Relationships: []
      }
      mensalidades: {
        Row: {
          id: string
          parceiro_id: string
          plano_id: string | null
          competencia: string
          valor: number
          status: MensalidadeStatus
          vencimento: string
          pago_em: string | null
          observacao: string | null
          created_at: string
        }
        Insert: {
          id?: string
          parceiro_id: string
          plano_id?: string | null
          competencia: string
          valor: number
          status?: MensalidadeStatus
          vencimento: string
          pago_em?: string | null
          observacao?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['mensalidades']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'mensalidades_parceiro_id_fkey'
            columns: ['parceiro_id']
            isOneToOne: false
            referencedRelation: 'parceiros'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mensalidades_plano_id_fkey'
            columns: ['plano_id']
            isOneToOne: false
            referencedRelation: 'planos'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_parceiro: {
        Args: Record<string, never>
        Returns: boolean
      }
      current_parceiro_id: {
        Args: Record<string, never>
        Returns: string
      }
      membros_aniversariantes_mes: {
        Args: Record<string, never>
        Returns: { id: string; telefone: string }[]
      }
      parceiro_niveis_disponiveis: {
        Args: Record<string, never>
        Returns: Database['public']['Tables']['cupom_niveis']['Row'][]
      }
      parceiro_buscar_cupom: {
        Args: { p_codigo: string }
        Returns: {
          id: string
          codigo: string
          status: CupomStatus
          data_validade: string
          pontos_utilizados: number
          membro_nome: string
          nivel_nome: string
          nivel_descricao: string | null
          tipo_beneficio: CupomBeneficioTipo
          valor_beneficio: number | null
        }[]
      }
      verificar_pin_atendente: {
        Args: { p_atendente_id: string; p_pin: string }
        Returns: { id: string; nome: string; parceiro_id: string }[]
      }
      criar_atendente: {
        Args:
          | { p_nome: string; p_pin: string }
          | { p_parceiro_id: string; p_nome: string; p_pin: string }
        Returns: Database['public']['Tables']['atendentes']['Row']
      }
      redefinir_pin_atendente: {
        Args:
          | { p_atendente_id: string; p_pin: string }
          | { p_parceiro_id: string; p_atendente_id: string; p_pin: string }
        Returns: void
      }
      resgatar_cupom: {
        Args: { p_cupom_id: string; p_atendente_id: string }
        Returns: {
          membro_nome: string
          pontos_utilizados: number
          saldo_atual: number
          nivel_nome: string
        }[]
      }
      gerar_cupom_membro: {
        Args: { p_membro_id: string; p_cupom_nivel_id: string }
        Returns: {
          codigo: string
          nivel_nome: string
          pontos_utilizados: number
          data_validade: string
          saldo_atual: number
        }[]
      }
      admin_ajustar_pontos: {
        Args: { p_membro_id: string; p_parceiro_id: string; p_pontos: number; p_descricao: string }
        Returns: Database['public']['Tables']['membros']['Row']
      }
      admin_emitir_cupom: {
        Args: { p_membro_id: string; p_cupom_nivel_id: string; p_parceiro_id: string }
        Returns: Database['public']['Tables']['cupons']['Row']
      }
      admin_dashboard_stats: {
        Args: Record<string, never>
        Returns: {
          membros_ativos: number
          pontos_gerados_hoje: number
          cupons_ativos: number
          resgates_hoje: number
        }[]
      }
      admin_ranking_parceiros: {
        Args: { p_limite?: number }
        Returns: {
          parceiro_id: string
          nome: string
          pontos_gerados: number
          total_transacoes: number
          cupons_resgatados: number
        }[]
      }
      parceiro_dashboard_stats: {
        Args: Record<string, never>
        Returns: {
          membros_ativos: number
          pontos_gerados: number
          cupons_resgatados: number
          desconto_concedido: number
          novos_clientes_mes: number
        }[]
      }
      parceiro_clientes: {
        Args: Record<string, never>
        Returns: {
          membro_id: string
          nome: string
          telefone: string
          ultimo_acesso: string | null
          total_gasto: number
          pontos_gerados: number
        }[]
      }
      parceiro_relatorio_mensal: {
        Args: { p_parceiro_id: string; p_referencia?: string }
        Returns: {
          parceiro_id: string
          parceiro_nome: string
          mes_referencia: string
          membros_ativos: number
          novos_clientes: number
          total_transacoes: number
          valor_movimentado: number
          pontos_gerados: number
          cupons_resgatados: number
          desconto_concedido: number
        }[]
      }
    }
    Enums: Record<string, never>
  }
}
