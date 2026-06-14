'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getPerfilAtual } from '@/lib/auth/perfil'
import { sanitizarErro } from '@/lib/utils/erros'

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
      return { error: sanitizarErro(erroMembro, 'Erro ao cadastrar membro.') }
    }

    membro = novoMembro
  }

  const { data: parceiro } = await supabase
    .from('parceiros')
    .select('taxa_conversao_pontos, teto_pontos_mensal')
    .eq('id', perfil.parceiro_id)
    .single()

  const taxa = parceiro?.taxa_conversao_pontos ?? 1
  let pontos = Math.floor(valorCompra * taxa)

  if (parceiro?.teto_pontos_mensal != null) {
    const agora = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

    const { data: transacoesMes } = await supabase
      .from('transacoes')
      .select('pontos')
      .eq('parceiro_id', perfil.parceiro_id)
      .eq('tipo', 'credito')
      .gte('created_at', inicioMes)

    const pontosJaMes = (transacoesMes ?? []).reduce((soma, t) => soma + t.pontos, 0)

    if (pontosJaMes + pontos > parceiro.teto_pontos_mensal) {
      pontos = Math.max(0, parceiro.teto_pontos_mensal - pontosJaMes)
    }

    if (pontos === 0) {
      return { error: 'Teto mensal de pontos deste parceiro ja foi atingido.' }
    }
  }

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
    return { error: sanitizarErro(erroTransacao, 'Erro ao registrar a compra.') }
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
