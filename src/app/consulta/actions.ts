'use server'

import { createClient } from '@/lib/supabase/server'
import { telefoneSchema } from '@/lib/validations/schemas'

export type ConsultaCupom = {
  codigo: string
  nivel_nome: string
  data_validade: string
}

export type ConsultaResultado = {
  nome: string
  pontos_saldo: number
  nivel: string
  cupons: ConsultaCupom[]
}

export type ConsultaState = {
  error?: string
  resultado?: ConsultaResultado
}

export async function consultarSaldo(_prevState: ConsultaState, formData: FormData): Promise<ConsultaState> {
  const telefone = String(formData.get('telefone') ?? '').replace(/\D/g, '')

  const telefoneResult = telefoneSchema.safeParse(telefone)
  if (!telefoneResult.success) {
    return { error: 'Informe um telefone valido (DDD + numero, somente digitos).' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('consulta_publica_membro', { p_telefone: telefoneResult.data })

  if (error) {
    return { error: 'Erro ao consultar. Tente novamente.' }
  }

  const membro = data?.[0]
  if (!membro) {
    return { error: 'Nenhum cadastro encontrado com esse telefone.' }
  }

  return {
    resultado: {
      nome: membro.nome,
      pontos_saldo: membro.pontos_saldo,
      nivel: membro.nivel,
      cupons: (membro.cupons as ConsultaCupom[] | null) ?? [],
    },
  }
}
