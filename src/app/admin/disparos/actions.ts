'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/types/database.types'

type Segmento = {
  tipo?: 'todos' | 'parceiro' | 'inativos' | 'aniversariantes' | 'saldo_minimo' | 'nunca_resgataram'
  parceiro_id?: string
  dias_inativos?: number
  saldo_minimo?: number
}

async function buscarDestinatarios(segmento: Segmento) {
  const supabase = createAdminClient()
  const tipo = segmento.tipo ?? 'todos'

  if (tipo === 'aniversariantes') {
    const { data } = await supabase.rpc('membros_aniversariantes_mes')
    return (data ?? []).filter((m) => !!m.telefone)
  }

  let query = supabase
    .from('membros')
    .select('id, telefone')
    .eq('ativo', true)

  if (tipo === 'parceiro' && segmento.parceiro_id) {
    query = query.eq('origem_parceiro_id', segmento.parceiro_id)
  }
  if (tipo === 'saldo_minimo' && segmento.saldo_minimo != null) {
    query = query.gte('pontos_saldo', segmento.saldo_minimo)
  }

  const { data } = await query
  let membros = data ?? []

  if (tipo === 'inativos') {
    const dias = segmento.dias_inativos ?? 30
    const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
    const { data: transacoes } = await supabase
      .from('transacoes')
      .select('membro_id, created_at')
      .order('created_at', { ascending: false })

    const ultimaPorMembro = new Map<string, string>()
    for (const t of transacoes ?? []) {
      if (!ultimaPorMembro.has(t.membro_id)) ultimaPorMembro.set(t.membro_id, t.created_at)
    }

    membros = membros.filter((m) => {
      const ultima = ultimaPorMembro.get(m.id)
      if (!ultima) return true
      return new Date(ultima) < limite
    })
  }

  if (tipo === 'nunca_resgataram') {
    const { data: cupons } = await supabase.from('cupons').select('membro_id').eq('status', 'resgatado')
    const resgataram = new Set((cupons ?? []).map((c) => c.membro_id))
    membros = membros.filter((m) => !resgataram.has(m.id))
  }

  return membros.filter((m) => !!m.telefone)
}

async function enviarMensagensWhatsapp(telefones: string[], mensagem: string) {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instancia = process.env.EVOLUTION_INSTANCE

  if (!apiUrl || !apiKey || !instancia) {
    throw new Error('Configuracao da Evolution API ausente (EVOLUTION_API_URL/EVOLUTION_API_KEY/EVOLUTION_INSTANCE).')
  }

  let enviados = 0
  for (const telefone of telefones) {
    try {
      const res = await fetch(`${apiUrl}/message/sendText/${instancia}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({ number: telefone, text: mensagem }),
      })
      if (res.ok) {
        enviados += 1
      }
    } catch {
      // ignora falhas individuais e segue o envio para os demais
    }
  }
  return enviados
}

export async function criarDisparo(_prevState: { error?: string }, formData: FormData) {
  const titulo = String(formData.get('titulo') ?? '').trim()
  const mensagem = String(formData.get('mensagem') ?? '').trim()
  const acao = String(formData.get('acao') ?? 'rascunho')
  const agendado_para = String(formData.get('agendado_para') ?? '').trim()

  const tipoSegmentacao = String(formData.get('tipo_segmentacao') ?? 'todos').trim() as Segmento['tipo']
  const parceiroId = String(formData.get('parceiro_id') ?? '').trim()
  const diasInativosRaw = String(formData.get('dias_inativos') ?? '').trim()
  const saldoMinimoRaw = String(formData.get('saldo_minimo') ?? '').trim()

  if (!titulo || !mensagem) {
    return { error: 'Informe o titulo e a mensagem do disparo.' }
  }

  if (acao === 'agendar' && !agendado_para) {
    return { error: 'Informe a data/hora de agendamento.' }
  }

  const segmento: Segmento = { tipo: tipoSegmentacao || 'todos' }

  if (segmento.tipo === 'parceiro') {
    if (!parceiroId) {
      return { error: 'Selecione o parceiro para esta segmentacao.' }
    }
    segmento.parceiro_id = parceiroId
  }

  if (segmento.tipo === 'inativos') {
    const dias = Number(diasInativosRaw)
    if (!diasInativosRaw || Number.isNaN(dias) || dias <= 0) {
      return { error: 'Informe um numero valido de dias de inatividade.' }
    }
    segmento.dias_inativos = dias
  }

  if (segmento.tipo === 'saldo_minimo') {
    const saldo = Number(saldoMinimoRaw)
    if (!saldoMinimoRaw || Number.isNaN(saldo) || saldo < 0) {
      return { error: 'Informe um valor valido para o saldo minimo de pontos.' }
    }
    segmento.saldo_minimo = saldo
  }

  const destinatarios = await buscarDestinatarios(segmento)

  const supabase = await createClient()

  const insertData: Database['public']['Tables']['disparos']['Insert'] = {
    titulo,
    canal: 'whatsapp',
    segmento,
    mensagem,
    status: acao === 'agendar' ? 'agendado' : acao === 'enviar_agora' ? 'enviando' : 'rascunho',
    agendado_para: acao === 'agendar' ? new Date(agendado_para).toISOString() : null,
    total_destinatarios: destinatarios.length,
    parceiro_id: segmento.tipo === 'parceiro' ? parceiroId : null,
  }

  const { data: disparo, error } = await supabase.from('disparos').insert(insertData).select('id').single()

  if (error || !disparo) {
    return { error: error?.message ?? 'Erro ao criar disparo.' }
  }

  if (acao === 'enviar_agora') {
    try {
      const enviados = await enviarMensagensWhatsapp(
        destinatarios.map((d) => d.telefone),
        mensagem,
      )
      await supabase
        .from('disparos')
        .update({ status: 'enviado', enviado_em: new Date().toISOString(), total_enviados: enviados })
        .eq('id', disparo.id)
    } catch (err) {
      await supabase.from('disparos').update({ status: 'cancelado' }).eq('id', disparo.id)
      return { error: err instanceof Error ? err.message : 'Erro ao enviar mensagens.' }
    }
  }

  revalidatePath('/admin/disparos')
  redirect('/admin/disparos')
}

export async function enviarDisparoAgendado(disparoId: string) {
  const supabase = await createClient()
  const { data: disparo } = await supabase.from('disparos').select('*').eq('id', disparoId).maybeSingle()

  if (!disparo || disparo.status === 'enviado' || disparo.status === 'enviando') {
    return
  }

  await supabase.from('disparos').update({ status: 'enviando' }).eq('id', disparoId)

  const segmento = (disparo.segmento ?? {}) as Segmento
  const destinatarios = await buscarDestinatarios(segmento)

  try {
    const enviados = await enviarMensagensWhatsapp(
      destinatarios.map((d) => d.telefone),
      disparo.mensagem,
    )
    await supabase
      .from('disparos')
      .update({ status: 'enviado', enviado_em: new Date().toISOString(), total_enviados: enviados })
      .eq('id', disparoId)
  } catch {
    await supabase.from('disparos').update({ status: 'agendado' }).eq('id', disparoId)
  }

  revalidatePath('/admin/disparos')
}

export async function cancelarDisparo(disparoId: string) {
  const supabase = await createClient()
  await supabase.from('disparos').update({ status: 'cancelado' }).eq('id', disparoId)
  revalidatePath('/admin/disparos')
}
