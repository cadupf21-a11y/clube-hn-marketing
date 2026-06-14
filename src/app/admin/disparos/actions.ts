'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizarErro } from '@/lib/utils/erros'
import type { Database } from '@/lib/types/database.types'

type Segmento = {
  tipo?: 'todos' | 'parceiro' | 'inativos' | 'aniversariantes' | 'saldo_minimo' | 'nunca_resgataram' | 'grupo'
  parceiro_id?: string
  dias_inativos?: number
  saldo_minimo?: number
  grupo_jid?: string
}

const GRUPO_WHATSAPP_JID = '120363408470313611@g.us'

async function buscarDestinatarios(segmento: Segmento) {
  const supabase = createAdminClient()
  const tipo = segmento.tipo ?? 'todos'

  if (tipo === 'aniversariantes') {
    const { data } = await supabase.rpc('membros_aniversariantes_mes')
    return (data ?? []).filter((m) => !!m.telefone)
  }

  if (tipo === 'inativos') {
    const dias = segmento.dias_inativos ?? 30
    const { data } = await supabase.rpc('membros_inativos', { p_dias_inativos: dias })
    return (data ?? []).filter((m) => !!m.telefone)
  }

  if (tipo === 'nunca_resgataram') {
    const { data } = await supabase.rpc('membros_nunca_resgataram')
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
  const membros = data ?? []

  return membros.filter((m) => !!m.telefone)
}

type ParseSegmentoResultado = { segmento: Segmento; parceiroId: string | null } | { error: string }

function parseSegmento(formData: FormData): ParseSegmentoResultado {
  const tipoSegmentacao = String(formData.get('tipo_segmentacao') ?? 'todos').trim() as Segmento['tipo']
  const parceiroId = String(formData.get('parceiro_id') ?? '').trim()
  const diasInativosRaw = String(formData.get('dias_inativos') ?? '').trim()
  const saldoMinimoRaw = String(formData.get('saldo_minimo') ?? '').trim()

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

  return { segmento, parceiroId: segmento.tipo === 'parceiro' ? parceiroId : null }
}

type Destinatario = { id: string; telefone: string }

type EnvioResultado = {
  enviados: number
  finalizado: boolean
}

async function enviarMensagensWhatsapp(
  disparoId: string,
  destinatarios: Destinatario[],
  mensagem: string,
): Promise<EnvioResultado> {
  const webhookUrl = process.env.N8N_DISPARO_WEBHOOK_URL

  if (webhookUrl) {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disparo_id: disparoId,
        mensagem,
        destinatarios: destinatarios.map((d) => ({ membro_id: d.id, telefone: d.telefone })),
      }),
    })

    if (!res.ok) {
      throw new Error('Falha ao acionar o webhook do n8n para envio do disparo.')
    }

    const data = await res.json().catch(() => null)
    const enviados = typeof data?.enviados === 'number' ? data.enviados : destinatarios.length

    // n8n processa o envio em background e atualiza disparos.status/total_enviados ao final
    return { enviados, finalizado: false }
  }

  const apiUrl = process.env.EVOLUTION_API_URL?.trim()
  const apiKey = process.env.EVOLUTION_API_KEY?.trim()
  const instancia = process.env.EVOLUTION_INSTANCE?.trim()

  if (!apiUrl || !apiKey || !instancia) {
    throw new Error('Configuracao de envio ausente (defina N8N_DISPARO_WEBHOOK_URL ou EVOLUTION_API_URL/EVOLUTION_API_KEY/EVOLUTION_INSTANCE).')
  }

  let enviados = 0
  for (const destinatario of destinatarios) {
    try {
      const res = await fetch(`${apiUrl}/message/sendText/${instancia}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({ number: destinatario.telefone, text: mensagem }),
      })
      if (res.ok) {
        enviados += 1
      }
    } catch {
      // ignora falhas individuais e segue o envio para os demais
    }
  }
  return { enviados, finalizado: true }
}

async function enviarMensagemGrupoWhatsapp(mensagem: string): Promise<void> {
  const apiUrl = process.env.EVOLUTION_API_URL?.trim()
  const apiKey = process.env.EVOLUTION_API_KEY?.trim()
  const instancia = process.env.EVOLUTION_INSTANCE?.trim()

  if (!apiUrl || !apiKey || !instancia) {
    throw new Error('Configuracao da Evolution API ausente (defina EVOLUTION_API_URL/EVOLUTION_API_KEY/EVOLUTION_INSTANCE).')
  }

  const res = await fetch(`${apiUrl}/message/sendText/${encodeURIComponent(instancia)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify({ number: GRUPO_WHATSAPP_JID, text: mensagem }),
  })

  if (!res.ok) {
    const corpo = await res.text().catch(() => '')
    console.error('Erro Evolution API ao enviar mensagem para o grupo:', res.status, res.statusText, corpo)
    throw new Error(`Falha ao enviar mensagem para o grupo via Evolution API (status ${res.status}): ${corpo || res.statusText}`)
  }
}

export async function criarDisparoGrupo(_prevState: { error?: string }, formData: FormData) {
  const titulo = String(formData.get('titulo') ?? '').trim()
  const mensagem = String(formData.get('mensagem') ?? '').trim()
  const acao = String(formData.get('acao') ?? 'rascunho')
  const agendado_para = String(formData.get('agendado_para') ?? '').trim()

  if (!titulo || !mensagem) {
    return { error: 'Informe o titulo e a mensagem do disparo.' }
  }

  if (acao === 'agendar' && !agendado_para) {
    return { error: 'Informe a data/hora de agendamento.' }
  }

  const supabase = await createClient()

  const insertData: Database['public']['Tables']['disparos']['Insert'] = {
    titulo,
    canal: 'whatsapp',
    segmento: { tipo: 'grupo', grupo_jid: GRUPO_WHATSAPP_JID },
    mensagem,
    status: acao === 'agendar' ? 'agendado' : acao === 'enviar_agora' ? 'enviando' : 'rascunho',
    agendado_para: acao === 'agendar' ? new Date(agendado_para).toISOString() : null,
    total_destinatarios: 1,
  }

  const { data: disparo, error } = await supabase.from('disparos').insert(insertData).select('id').single()

  if (error || !disparo) {
    return { error: sanitizarErro(error, 'Erro ao criar disparo.') }
  }

  if (acao === 'enviar_agora') {
    try {
      await enviarMensagemGrupoWhatsapp(mensagem)
      await supabase
        .from('disparos')
        .update({ status: 'enviado', enviado_em: new Date().toISOString(), total_enviados: 1 })
        .eq('id', disparo.id)
    } catch (err) {
      await supabase.from('disparos').update({ status: 'cancelado' }).eq('id', disparo.id)
      return { error: err instanceof Error ? err.message : 'Erro ao enviar mensagem.' }
    }
  }

  revalidatePath('/admin/disparos')
  redirect('/admin/disparos?tab=grupo')
}

export async function atualizarDisparoGrupo(disparoId: string, _prevState: { error?: string }, formData: FormData) {
  const supabase = await createClient()

  const { data: disparoAtual } = await supabase.from('disparos').select('status').eq('id', disparoId).maybeSingle()

  if (!disparoAtual || (disparoAtual.status !== 'rascunho' && disparoAtual.status !== 'agendado')) {
    return { error: 'Este disparo nao pode mais ser editado.' }
  }

  const titulo = String(formData.get('titulo') ?? '').trim()
  const mensagem = String(formData.get('mensagem') ?? '').trim()
  const acao = String(formData.get('acao') ?? 'rascunho')
  const agendado_para = String(formData.get('agendado_para') ?? '').trim()

  if (!titulo || !mensagem) {
    return { error: 'Informe o titulo e a mensagem do disparo.' }
  }

  if (acao === 'agendar' && !agendado_para) {
    return { error: 'Informe a data/hora de agendamento.' }
  }

  const updateData: Database['public']['Tables']['disparos']['Update'] = {
    titulo,
    mensagem,
    segmento: { tipo: 'grupo', grupo_jid: GRUPO_WHATSAPP_JID },
    status: acao === 'agendar' ? 'agendado' : acao === 'enviar_agora' ? 'enviando' : 'rascunho',
    agendado_para: acao === 'agendar' ? new Date(agendado_para).toISOString() : null,
    total_destinatarios: 1,
  }

  const { error } = await supabase.from('disparos').update(updateData).eq('id', disparoId)

  if (error) {
    return { error: sanitizarErro(error, 'Erro ao atualizar disparo.') }
  }

  if (acao === 'enviar_agora') {
    try {
      await enviarMensagemGrupoWhatsapp(mensagem)
      await supabase
        .from('disparos')
        .update({ status: 'enviado', enviado_em: new Date().toISOString(), total_enviados: 1 })
        .eq('id', disparoId)
    } catch (err) {
      await supabase.from('disparos').update({ status: 'cancelado' }).eq('id', disparoId)
      return { error: err instanceof Error ? err.message : 'Erro ao enviar mensagem.' }
    }
  }

  revalidatePath('/admin/disparos')
  redirect('/admin/disparos?tab=grupo')
}

export async function criarDisparo(_prevState: { error?: string }, formData: FormData) {
  const titulo = String(formData.get('titulo') ?? '').trim()
  const mensagem = String(formData.get('mensagem') ?? '').trim()
  const acao = String(formData.get('acao') ?? 'rascunho')
  const agendado_para = String(formData.get('agendado_para') ?? '').trim()

  if (!titulo || !mensagem) {
    return { error: 'Informe o titulo e a mensagem do disparo.' }
  }

  if (acao === 'agendar' && !agendado_para) {
    return { error: 'Informe a data/hora de agendamento.' }
  }

  const parsed = parseSegmento(formData)
  if ('error' in parsed) {
    return { error: parsed.error }
  }
  const { segmento, parceiroId } = parsed

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
    parceiro_id: parceiroId,
  }

  const { data: disparo, error } = await supabase.from('disparos').insert(insertData).select('id').single()

  if (error || !disparo) {
    return { error: sanitizarErro(error, 'Erro ao criar disparo.') }
  }

  if (acao === 'enviar_agora') {
    try {
      const resultado = await enviarMensagensWhatsapp(disparo.id, destinatarios, mensagem)
      if (resultado.finalizado) {
        await supabase
          .from('disparos')
          .update({ status: 'enviado', enviado_em: new Date().toISOString(), total_enviados: resultado.enviados })
          .eq('id', disparo.id)
      } else {
        await supabase.from('disparos').update({ total_enviados: resultado.enviados }).eq('id', disparo.id)
      }
    } catch (err) {
      await supabase.from('disparos').update({ status: 'cancelado' }).eq('id', disparo.id)
      return { error: err instanceof Error ? err.message : 'Erro ao enviar mensagens.' }
    }
  }

  revalidatePath('/admin/disparos')
  redirect('/admin/disparos')
}

async function processarEnvioAgendado(
  supabase: SupabaseClient<Database>,
  disparo: Database['public']['Tables']['disparos']['Row'],
) {
  await supabase.from('disparos').update({ status: 'enviando' }).eq('id', disparo.id)

  const segmento = (disparo.segmento ?? {}) as Segmento

  if (segmento.tipo === 'grupo') {
    try {
      await enviarMensagemGrupoWhatsapp(disparo.mensagem)
      await supabase
        .from('disparos')
        .update({ status: 'enviado', enviado_em: new Date().toISOString(), total_enviados: 1 })
        .eq('id', disparo.id)
    } catch {
      await supabase.from('disparos').update({ status: 'agendado' }).eq('id', disparo.id)
    }
    return
  }

  const destinatarios = await buscarDestinatarios(segmento)

  try {
    const resultado = await enviarMensagensWhatsapp(disparo.id, destinatarios, disparo.mensagem)
    if (resultado.finalizado) {
      await supabase
        .from('disparos')
        .update({ status: 'enviado', enviado_em: new Date().toISOString(), total_enviados: resultado.enviados })
        .eq('id', disparo.id)
    } else {
      await supabase.from('disparos').update({ total_enviados: resultado.enviados }).eq('id', disparo.id)
    }
  } catch {
    await supabase.from('disparos').update({ status: 'agendado' }).eq('id', disparo.id)
  }
}

export async function enviarDisparoAgendado(disparoId: string) {
  const supabase = await createClient()
  const { data: disparo } = await supabase.from('disparos').select('*').eq('id', disparoId).maybeSingle()

  if (!disparo || disparo.status === 'enviado' || disparo.status === 'enviando') {
    return
  }

  await processarEnvioAgendado(supabase, disparo)

  revalidatePath('/admin/disparos')
}

export async function processarDisparosAgendados(supabase: SupabaseClient<Database>): Promise<number> {
  const { data: disparos } = await supabase
    .from('disparos')
    .select('*')
    .eq('status', 'agendado')
    .lte('agendado_para', new Date().toISOString())

  for (const disparo of disparos ?? []) {
    await processarEnvioAgendado(supabase, disparo)
  }

  return disparos?.length ?? 0
}

export async function cancelarDisparo(disparoId: string) {
  const supabase = await createClient()
  await supabase.from('disparos').update({ status: 'cancelado' }).eq('id', disparoId)
  revalidatePath('/admin/disparos')
}

export async function atualizarDisparo(disparoId: string, _prevState: { error?: string }, formData: FormData) {
  const supabase = await createClient()

  const { data: disparoAtual } = await supabase.from('disparos').select('status').eq('id', disparoId).maybeSingle()

  if (!disparoAtual || (disparoAtual.status !== 'rascunho' && disparoAtual.status !== 'agendado')) {
    return { error: 'Este disparo nao pode mais ser editado.' }
  }

  const titulo = String(formData.get('titulo') ?? '').trim()
  const mensagem = String(formData.get('mensagem') ?? '').trim()
  const acao = String(formData.get('acao') ?? 'rascunho')
  const agendado_para = String(formData.get('agendado_para') ?? '').trim()

  if (!titulo || !mensagem) {
    return { error: 'Informe o titulo e a mensagem do disparo.' }
  }

  if (acao === 'agendar' && !agendado_para) {
    return { error: 'Informe a data/hora de agendamento.' }
  }

  const parsed = parseSegmento(formData)
  if ('error' in parsed) {
    return { error: parsed.error }
  }
  const { segmento, parceiroId } = parsed

  const destinatarios = await buscarDestinatarios(segmento)

  const updateData: Database['public']['Tables']['disparos']['Update'] = {
    titulo,
    mensagem,
    segmento,
    status: acao === 'agendar' ? 'agendado' : acao === 'enviar_agora' ? 'enviando' : 'rascunho',
    agendado_para: acao === 'agendar' ? new Date(agendado_para).toISOString() : null,
    total_destinatarios: destinatarios.length,
    parceiro_id: parceiroId,
  }

  const { error } = await supabase.from('disparos').update(updateData).eq('id', disparoId)

  if (error) {
    return { error: sanitizarErro(error, 'Erro ao atualizar disparo.') }
  }

  if (acao === 'enviar_agora') {
    try {
      const resultado = await enviarMensagensWhatsapp(disparoId, destinatarios, mensagem)
      if (resultado.finalizado) {
        await supabase
          .from('disparos')
          .update({ status: 'enviado', enviado_em: new Date().toISOString(), total_enviados: resultado.enviados })
          .eq('id', disparoId)
      } else {
        await supabase.from('disparos').update({ total_enviados: resultado.enviados }).eq('id', disparoId)
      }
    } catch (err) {
      await supabase.from('disparos').update({ status: 'cancelado' }).eq('id', disparoId)
      return { error: err instanceof Error ? err.message : 'Erro ao enviar mensagens.' }
    }
  }

  revalidatePath('/admin/disparos')
  redirect('/admin/disparos')
}

export async function excluirDisparo(disparoId: string) {
  const supabase = await createClient()
  await supabase.from('disparos').delete().eq('id', disparoId)
  revalidatePath('/admin/disparos')
}
