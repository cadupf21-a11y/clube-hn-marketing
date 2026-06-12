// Gera o arquivo n8n/clube-hn-disparos-worker.json a partir deste script.
// Rodar com: node scripts/generate-disparos-worker-workflow.js
const fs = require('fs')
const path = require('path')

const processarDisparosCode = `
// ============================================================
// Worker de disparos agendados - Clube HN (Fase 6)
// A cada 5 minutos:
//  1) busca disparos com status='agendado' e agendado_para <= now()
//  2) marca cada um como 'enviando'
//  3) aplica os filtros de segmentacao e busca os membros elegiveis
//  4) envia a mensagem via Evolution API, com delay aleatorio
//     de 2 a 5 segundos entre cada envio (anti-ban)
//  5) marca o disparo como 'enviado', com total_destinatarios,
//     total_enviados e enviado_em
//
// Segmentacao (campo "segmento" jsonb em disparos):
//  - tipo: 'todos' | 'parceiro' | 'inativos' | 'aniversariantes'
//          | 'saldo_minimo' | 'nunca_resgataram' (default: 'todos')
//  - parceiro_id: usado quando tipo = 'parceiro'
//  - dias_inativos: usado quando tipo = 'inativos' (default 30)
//  - saldo_minimo: usado quando tipo = 'saldo_minimo'
//  - Campos legados (compat com /admin/disparos), aplicados como
//    filtros adicionais quando presentes:
//      nivel, origem_parceiro_id, pontos_minimos
// ============================================================

const SUPABASE_URL = ($env.CLUBE_SUPABASE_URL || '').replace(/\\/$/, '')
const SUPABASE_KEY = $env.CLUBE_SUPABASE_SERVICE_KEY
const EVOLUTION_API_URL = ($env.EVOLUTION_API_URL || '').replace(/\\/$/, '')
const EVOLUTION_API_KEY = $env.EVOLUTION_API_KEY
const EVOLUTION_INSTANCE = $env.EVOLUTION_INSTANCE
const httpRequest = this.helpers.httpRequest.bind(this)

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
}

async function supaGet(pathAndQuery) {
  return httpRequest({
    method: 'GET',
    url: SUPABASE_URL + '/rest/v1/' + pathAndQuery,
    headers,
    json: true,
  })
}

async function supaPatch(tableAndQuery, body) {
  return httpRequest({
    method: 'PATCH',
    url: SUPABASE_URL + '/rest/v1/' + tableAndQuery,
    headers: Object.assign({}, headers, { Prefer: 'return=minimal' }),
    body,
    json: true,
  })
}

function delayAntiBan() {
  const ms = 2000 + Math.floor(Math.random() * 3001) // entre 2000 e 5000 ms
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function enviarWhatsapp(telefone, mensagem) {
  return httpRequest({
    method: 'POST',
    url: EVOLUTION_API_URL + '/message/sendText/' + EVOLUTION_INSTANCE,
    headers: {
      apikey: EVOLUTION_API_KEY,
      'Content-Type': 'application/json',
    },
    body: { number: telefone, text: mensagem },
    json: true,
  })
}

async function buscarDestinatarios(segmentoRaw) {
  const seg = segmentoRaw || {}

  let membros = await supaGet(
    'membros?ativo=eq.true&select=id,nome,telefone,nivel,pontos_saldo,origem_parceiro_id,data_nascimento'
  )
  membros = Array.isArray(membros) ? membros : []

  // ------------------------------------------------------------
  // Filtros legados (compat com o formulario /admin/disparos)
  // ------------------------------------------------------------
  if (seg.nivel) {
    membros = membros.filter((m) => m.nivel === seg.nivel)
  }
  if (seg.origem_parceiro_id) {
    membros = membros.filter((m) => m.origem_parceiro_id === seg.origem_parceiro_id)
  }
  if (seg.pontos_minimos != null) {
    membros = membros.filter((m) => (m.pontos_saldo ?? 0) >= Number(seg.pontos_minimos))
  }

  // ------------------------------------------------------------
  // Tipos de segmentacao
  // ------------------------------------------------------------
  const tipo = seg.tipo || 'todos'

  if (tipo === 'parceiro' && seg.parceiro_id) {
    membros = membros.filter((m) => m.origem_parceiro_id === seg.parceiro_id)
  }

  if (tipo === 'saldo_minimo' && seg.saldo_minimo != null) {
    membros = membros.filter((m) => (m.pontos_saldo ?? 0) >= Number(seg.saldo_minimo))
  }

  if (tipo === 'aniversariantes') {
    const mesAtual = new Date().getMonth() + 1
    membros = membros.filter((m) => {
      if (!m.data_nascimento) return false
      const mes = parseInt(String(m.data_nascimento).slice(5, 7), 10)
      return mes === mesAtual
    })
  }

  if (tipo === 'inativos') {
    const dias = Number(seg.dias_inativos) || 30
    const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
    const transacoes = await supaGet('transacoes?select=membro_id,created_at&order=created_at.desc')
    const ultimaPorMembro = new Map()
    for (const t of Array.isArray(transacoes) ? transacoes : []) {
      if (!ultimaPorMembro.has(t.membro_id)) ultimaPorMembro.set(t.membro_id, t.created_at)
    }
    membros = membros.filter((m) => {
      const ultima = ultimaPorMembro.get(m.id)
      if (!ultima) return true // nunca transacionou conta como inativo
      return new Date(ultima) < limite
    })
  }

  if (tipo === 'nunca_resgataram') {
    const cupons = await supaGet('cupons?status=eq.resgatado&select=membro_id')
    const resgataram = new Set((Array.isArray(cupons) ? cupons : []).map((c) => c.membro_id))
    membros = membros.filter((m) => !resgataram.has(m.id))
  }

  return membros.filter((m) => !!m.telefone)
}

const agora = new Date().toISOString()
const disparos = await supaGet(
  'disparos?status=eq.agendado&agendado_para=lte.' + encodeURIComponent(agora) + '&select=*'
)

const resultados = []

for (const disparo of Array.isArray(disparos) ? disparos : []) {
  await supaPatch('disparos?id=eq.' + disparo.id, { status: 'enviando' })

  let destinatarios = []
  let enviados = 0

  try {
    destinatarios = await buscarDestinatarios(disparo.segmento)

    for (const membro of destinatarios) {
      try {
        await enviarWhatsapp(membro.telefone, disparo.mensagem)
        enviados += 1
      } catch (e) {
        // ignora falha individual e segue o envio para os demais
      }
      await delayAntiBan()
    }

    await supaPatch('disparos?id=eq.' + disparo.id, {
      status: 'enviado',
      enviado_em: new Date().toISOString(),
      total_destinatarios: destinatarios.length,
      total_enviados: enviados,
    })
  } catch (e) {
    await supaPatch('disparos?id=eq.' + disparo.id, { status: 'agendado' })
    throw e
  }

  resultados.push({
    json: {
      disparo_id: disparo.id,
      titulo: disparo.titulo,
      total_destinatarios: destinatarios.length,
      total_enviados: enviados,
    },
  })
}

return resultados.length ? resultados : [{ json: { processados: 0 } }]
`.trim()

const workflow = {
  name: 'Clube HN - Worker de Disparos',
  nodes: [
    {
      parameters: {
        content:
          '## Clube HN - Worker de Disparos (Fase 6)\n\n' +
          'Variaveis de ambiente do n8n necessarias:\n' +
          '- `CLUBE_SUPABASE_URL`\n' +
          '- `CLUBE_SUPABASE_SERVICE_KEY`\n' +
          '- `EVOLUTION_API_URL` (ex: https://n8n-evolution-api.k41knm.easypanel.host)\n' +
          '- `EVOLUTION_API_KEY` (apikey global da Evolution API)\n' +
          '- `EVOLUTION_INSTANCE` (nome da instancia do WhatsApp)\n\n' +
          'Roda a cada 5 minutos. Busca disparos com status "agendado" e\n' +
          '`agendado_para <= now()`, marca como "enviando", resolve o\n' +
          'publico-alvo via campo "segmento" (jsonb), envia via Evolution API\n' +
          'com delay aleatorio de 2 a 5s entre mensagens (anti-ban) e marca\n' +
          'como "enviado" com total_destinatarios/total_enviados/enviado_em.',
      },
      id: 'sticky-overview',
      name: 'Visao Geral',
      type: 'n8n-nodes-base.stickyNote',
      typeVersion: 1,
      position: [-480, -300],
    },
    {
      parameters: {
        rule: {
          interval: [
            {
              field: 'minutes',
              minutesInterval: 5,
            },
          ],
        },
      },
      id: 'schedule-5min',
      name: 'A cada 5 minutos',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [-480, 0],
    },
    {
      parameters: {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: processarDisparosCode,
      },
      id: 'code-processar-disparos',
      name: 'Processar Disparos Agendados',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [-260, 0],
    },
  ],
  connections: {
    'A cada 5 minutos': {
      main: [[{ node: 'Processar Disparos Agendados', type: 'main', index: 0 }]],
    },
  },
  active: false,
  settings: {
    executionOrder: 'v1',
  },
  pinData: {},
}

const outDir = path.join(__dirname, '..', 'n8n')
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'clube-hn-disparos-worker.json')
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8')
console.log('Gerado:', outPath)
