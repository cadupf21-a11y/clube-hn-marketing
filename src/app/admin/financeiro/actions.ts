'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sanitizarErro } from '@/lib/utils/erros'
import type { Database } from '@/lib/types/database.types'

type MensalidadeStatus = Database['public']['Tables']['mensalidades']['Row']['status']

export async function criarPlano(_prevState: { error?: string }, formData: FormData) {
  const nome = String(formData.get('nome') ?? '').trim()
  const valorRaw = String(formData.get('valor_mensal') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()

  const valor_mensal = Number(valorRaw)
  if (!nome) return { error: 'Informe o nome do plano.' }
  if (!valorRaw || Number.isNaN(valor_mensal) || valor_mensal < 0) {
    return { error: 'Informe um valor mensal valido.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('planos').insert({
    nome,
    valor_mensal,
    descricao: descricao || null,
  })

  if (error) {
    return { error: sanitizarErro(error, 'Erro ao criar plano.') }
  }

  revalidatePath('/admin/financeiro')
  return { error: undefined }
}

export async function alternarAtivoPlano(planoId: string, ativo: boolean) {
  const supabase = await createClient()
  await supabase.from('planos').update({ ativo }).eq('id', planoId)
  revalidatePath('/admin/financeiro')
}

export async function criarMensalidade(_prevState: { error?: string }, formData: FormData) {
  const parceiro_id = String(formData.get('parceiro_id') ?? '').trim()
  const plano_id = String(formData.get('plano_id') ?? '').trim()
  const competencia = String(formData.get('competencia') ?? '').trim()
  const valorRaw = String(formData.get('valor') ?? '').trim()
  const vencimento = String(formData.get('vencimento') ?? '').trim()
  const observacao = String(formData.get('observacao') ?? '').trim()

  if (!parceiro_id || !competencia || !vencimento) {
    return { error: 'Informe parceiro, competencia e vencimento.' }
  }

  const valor = Number(valorRaw)
  if (!valorRaw || Number.isNaN(valor) || valor < 0) {
    return { error: 'Informe um valor valido.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('mensalidades').insert({
    parceiro_id,
    plano_id: plano_id || null,
    competencia: `${competencia}-01`,
    valor,
    vencimento,
    observacao: observacao || null,
  })

  if (error) {
    return { error: sanitizarErro(error, 'Erro ao criar mensalidade.') }
  }

  revalidatePath('/admin/financeiro')
  return { error: undefined }
}

export async function atualizarStatusMensalidade(mensalidadeId: string, status: MensalidadeStatus) {
  const supabase = await createClient()
  const update: Database['public']['Tables']['mensalidades']['Update'] = { status }
  if (status === 'pago') {
    update.pago_em = new Date().toISOString()
  } else {
    update.pago_em = null
  }
  await supabase.from('mensalidades').update(update).eq('id', mensalidadeId)
  revalidatePath('/admin/financeiro')
}
