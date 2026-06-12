'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPerfilAtual } from '@/lib/auth/perfil'

export type LancarPontosSucesso = {
  membroNome: string
  pontosGanhos: number
  saldoAtual: number
}

export type LancarPontosState = {
  error?: string
  sucesso?: LancarPontosSucesso
}

export async function lancarPontos(
  _prevState: LancarPontosState,
  formData: FormData
): Promise<LancarPontosState> {
  const telefone = String(formData.get('telefone') ?? '').trim()
  const nome = String(formData.get('nome') ?? '').trim()
  const valorCompra = Number(formData.get('valor_compra') ?? 0)

  if (!telefone || !valorCompra || valorCompra <= 0) {
    return { error: 'Informe o telefone do membro e o valor da compra.' }
  }

  const perfil = await getPerfilAtual()
  const cookieStore = await cookies()
  const atendenteId = cookieStore.get('atendente_id')?.value

  if (!perfil?.parceiro_id || !atendenteId) {
    return { error: 'Sessao invalida. Faca a identificacao do atendente novamente.' }
  }

  const supabase = await createClient()

  let { data: membro } = await supabase
    .from('membros')
    .select('id, nome')
    .eq('telefone', telefone)
    .maybeSingle()

  if (!membro) {
    if (!nome) {
      return { error: 'Membro nao encontrado. Informe o nome para cadastrar.' }
    }

    const { data: novoMembro, error: erroMembro } = await supabase
      .from('membros')
      .insert({ nome, telefone, origem_parceiro_id: perfil.parceiro_id })
      .select('id, nome')
      .single()

    if (erroMembro || !novoMembro) {
      return { error: erroMembro?.message ?? 'Erro ao cadastrar membro.' }
    }

    membro = novoMembro
  }

  const { data: parceiro } = await supabase
    .from('parceiros')
    .select('taxa_conversao_pontos')
    .eq('id', perfil.parceiro_id)
    .single()

  const taxa = parceiro?.taxa_conversao_pontos ?? 1
  const pontos = Math.floor(valorCompra * taxa)

  const { error: erroTransacao } = await supabase.from('transacoes').insert({
    membro_id: membro.id,
    parceiro_id: perfil.parceiro_id,
    atendente_id: atendenteId,
    tipo: 'credito',
    valor_compra: valorCompra,
    pontos,
    descricao: 'Compra registrada no PDV',
  })

  if (erroTransacao) {
    return { error: erroTransacao.message }
  }

  const { data: membroAtualizado } = await supabase
    .from('membros')
    .select('pontos_saldo')
    .eq('id', membro.id)
    .single()

  revalidatePath('/pdv')

  return {
    sucesso: {
      membroNome: membro.nome,
      pontosGanhos: pontos,
      saldoAtual: membroAtualizado?.pontos_saldo ?? pontos,
    },
  }
}
