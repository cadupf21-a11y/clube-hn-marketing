// Gera o arquivo n8n/clube-hn-relatorio-mensal.json a partir deste script.
// Rodar com: node scripts/generate-relatorio-mensal-workflow.js
const fs = require('fs')
const path = require('path')

const montarRelatoriosCode = `
// ============================================================
// Relatorio mensal por parceiro - Clube HN (Fase 5)
// Busca todos os parceiros ativos com WhatsApp cadastrado,
// chama a RPC parceiro_relatorio_mensal (mes anterior por padrao)
// e monta a mensagem que sera enviada via Evolution API.
// ============================================================

const SUPABASE_URL = ($env.CLUBE_SUPABASE_URL || '').replace(/\\/$/, '')
const SUPABASE_KEY = $env.CLUBE_SUPABASE_SERVICE_KEY
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

async function supaRpc(fn, args) {
  return httpRequest({
    method: 'POST',
    url: SUPABASE_URL + '/rest/v1/rpc/' + fn,
    headers,
    body: args,
    json: true,
  })
}

function formatarMoeda(valor) {
  return 'R$ ' + Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function nomeMes(dataIso) {
  const data = new Date(dataIso + 'T00:00:00')
  const texto = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const parceiros = await supaGet('parceiros?ativo=eq.true&whatsapp=not.is.null&select=id,nome,whatsapp')

const resultados = []
for (const parceiro of Array.isArray(parceiros) ? parceiros : []) {
  const relatorios = await supaRpc('parceiro_relatorio_mensal', { p_parceiro_id: parceiro.id })
  const r = Array.isArray(relatorios) ? relatorios[0] : relatorios
  if (!r) continue

  const mensagem =
    '*Relatorio mensal - Clube HN*\\n' +
    parceiro.nome + '\\n' +
    'Periodo: ' + nomeMes(r.mes_referencia) + '\\n\\n' +
    'Membros ativos no mes: ' + r.membros_ativos + '\\n' +
    'Clientes novos pelo clube: ' + r.novos_clientes + '\\n' +
    'Transacoes registradas: ' + r.total_transacoes + '\\n' +
    'Valor movimentado: ' + formatarMoeda(r.valor_movimentado) + '\\n' +
    'Pontos gerados: ' + r.pontos_gerados + '\\n' +
    'Cupons resgatados: ' + r.cupons_resgatados + '\\n' +
    'Desconto concedido: ' + formatarMoeda(r.desconto_concedido) + '\\n\\n' +
    'Continue fidelizando seus clientes com o Clube HN!'

  resultados.push({
    json: {
      parceiro_id: parceiro.id,
      parceiro_nome: parceiro.nome,
      whatsapp: parceiro.whatsapp,
      mensagem,
    },
  })
}

return resultados
`.trim()

const workflow = {
  name: 'Clube HN - Relatorio Mensal por Parceiro',
  nodes: [
    {
      parameters: {
        content:
          '## Clube HN - Relatorio Mensal por Parceiro (Fase 5)\n\n' +
          'Variaveis de ambiente do n8n necessarias:\n' +
          '- `CLUBE_SUPABASE_URL`\n' +
          '- `CLUBE_SUPABASE_SERVICE_KEY`\n' +
          '- `EVOLUTION_API_URL` (ex: https://n8n-evolution-api.k41knm.easypanel.host)\n' +
          '- `EVOLUTION_API_KEY` (apikey global da Evolution API)\n' +
          '- `EVOLUTION_INSTANCE` (nome da instancia do WhatsApp)\n\n' +
          'Disparo: todo dia 1 de cada mes, as 8h.\n' +
          'Para cada parceiro ativo com WhatsApp cadastrado, busca os\n' +
          'dados do mes anterior via RPC `parceiro_relatorio_mensal`\n' +
          'e envia um resumo pelo WhatsApp do dono.',
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
              field: 'cronExpression',
              expression: '0 8 1 * *',
            },
          ],
        },
      },
      id: 'schedule-mensal',
      name: 'Todo dia 1 as 8h',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [-480, 0],
    },
    {
      parameters: {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: montarRelatoriosCode,
      },
      id: 'code-montar-relatorios',
      name: 'Montar Relatorios',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [-260, 0],
    },
    {
      parameters: {
        method: 'POST',
        url: '={{ $env.EVOLUTION_API_URL + "/message/sendText/" + $env.EVOLUTION_INSTANCE }}',
        sendHeaders: true,
        headerParameters: {
          parameters: [{ name: 'apikey', value: '={{ $env.EVOLUTION_API_KEY }}' }],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify({ number: $json.whatsapp, text: $json.mensagem }) }}',
        options: {},
      },
      id: 'http-enviar-relatorio',
      name: 'Enviar Relatorio WhatsApp',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [-40, 0],
    },
  ],
  connections: {
    'Todo dia 1 as 8h': {
      main: [[{ node: 'Montar Relatorios', type: 'main', index: 0 }]],
    },
    'Montar Relatorios': {
      main: [[{ node: 'Enviar Relatorio WhatsApp', type: 'main', index: 0 }]],
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
const outPath = path.join(outDir, 'clube-hn-relatorio-mensal.json')
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8')
console.log('Gerado:', outPath)
