'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPerfilAtual } from '@/lib/auth/perfil'
import type { CupomBeneficioTipo, CupomStatus } from '@/lib/types/database.types'

export type CupomPreview = {
  id: string
  codigo: string
  status: CupomStatus
  dataValidade: string
  pontosUtilizados: number
  membroNome: string
  nivelNome: string
  descricao: string | null
  tipoBeneficio: CupomBeneficioTipo
  valorBeneficio: number | null
}

export type BuscarCupomState = {
  error?: string
  cupom?: CupomPreview
}

export async function buscarCupom(
  _prevState: BuscarCupomState,
  formData: FormData
): Promise<BuscarCupomState> {
  const codigo = String(formData.get('codigo') ?? '').trim().toUpperCase()

  if (!codigo) {
    return { error: 'Informe o codigo do cupom.' }
  }

  const perfil = await getPerfilAtual()
  if (!perfil?.parceiro_id) {
    return { error: 'Sessao invalida. Faca a identificacao do atendente novamente.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('parceiro_buscar_cupom', { p_codigo: codigo })

  if (error || !data || data.length === 0) {
    return { error: 'Cupom nao encontrado.' }
  }

  const cupom = data[0]

  return {
    cupom: {
      id: cupom.id,
      codigo: cupom.codigo,
      status: cupom.status,
      dataValidade: cupom.data_validade,
      pontosUtilizados: cupom.pontos_utilizados,
      membroNome: cupom.membro_nome ?? '-',
      nivelNome: cupom.nivel_nome ?? '-',
      descricao: cupom.nivel_descricao ?? null,
      tipoBeneficio: cupom.tipo_beneficio ?? 'outro',
      valorBeneficio: cupom.valor_beneficio ?? null,
    },
  }
}

export type ConfirmarResgateSucesso = {
  membroNome: string
  pontosUtilizados: number
  saldoAtual: number
  nivelNome: string
}

export type ConfirmarResgateState = {
  error?: string
  sucesso?: ConfirmarResgateSucesso
}

export async function confirmarResgate(
  _prevState: ConfirmarResgateState,
  formData: FormData
): Promise<ConfirmarResgateState> {
  const cupomId = String(formData.get('cupom_id') ?? '')

  if (!cupomId) {
    return { error: 'Cupom invalido.' }
  }

  const cookieStore = await cookies()
  const atendenteId = cookieStore.get('atendente_id')?.value

  if (!atendenteId) {
    return { error: 'Sessao invalida. Faca a identificacao do atendente novamente.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('resgatar_cupom', {
    p_cupom_id: cupomId,
    p_atendente_id: atendenteId,
  })

  if (error || !data || data.length === 0) {
    return { error: error?.message ?? 'Nao foi possivel validar o cupom.' }
  }

  const resultado = data[0]

  revalidatePath('/pdv/cupom')

  return {
    sucesso: {
      membroNome: resultado.membro_nome,
      pontosUtilizados: resultado.pontos_utilizados,
      saldoAtual: resultado.saldo_atual,
      nivelNome: resultado.nivel_nome,
    },
  }
}
