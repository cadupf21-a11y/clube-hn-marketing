// Gera o arquivo n8n/clube-hn-bot-whatsapp.json a partir deste script.
// Rodar com: node scripts/generate-n8n-workflow.js
const fs = require('fs')
const path = require('path')

const extrairMensagemCode = `
// Le o webhook da Evolution API (evento messages.upsert) e normaliza
// para { telefone, texto, pushName, valido }
const body = $input.first().json.body ?? $input.first().json
const dataArr = Array.isArray(body.data) ? body.data : [body.data]

const results = []
for (const data of dataArr) {
  if (!data) continue
  const remoteJid = (data.key && data.key.remoteJid) || ''
  const fromMe = !!(data.key && data.key.fromMe)
  const isGroup = remoteJid.endsWith('@g.us')
  const telefone = remoteJid.split('@')[0]
  const msg = data.message || {}
  const texto =
    msg.conversation ||
    (msg.extendedTextMessage && msg.extendedTextMessage.text) ||
    (msg.buttonsResponseMessage && msg.buttonsResponseMessage.selectedButtonId) ||
    (msg.listResponseMessage && msg.listResponseMessage.title) ||
    ''
  const pushName = data.pushName || ''
  const valido = !fromMe && !isGroup && !!telefone && !!String(texto).trim()

  results.push({
    json: {
      telefone,
      texto: String(texto).trim(),
      pushName,
      valido,
    },
  })
}

return results.length ? results : [{ json: { valido: false } }]
`.trim()

const motorConversaCode = `
// ============================================================
// Motor de conversa do Bot WhatsApp - Clube HN
// Implementa os 7 fluxos da Fase 3:
//  1) Cadastro de novo membro
//  2) Menu principal
//  3) Consulta de saldo + proximo nivel
//  4) Resgate de cupom (listagem + escolha + geracao via RPC)
//  5) Listagem de cupons ativos
//  6) Historico de transacoes
//  7) Mensagem de ajuda
// O estado da conversa fica salvo no Redis (node anterior/posterior).
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

async function supaPost(table, body) {
  return httpRequest({
    method: 'POST',
    url: SUPABASE_URL + '/rest/v1/' + table,
    headers: Object.assign({}, headers, { Prefer: 'return=representation' }),
    body,
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

function validarCPF(cpf) {
  if (!/^\\d{11}$/.test(cpf)) return false
  if (/^(\\d)\\1{10}$/.test(cpf)) return false
  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i], 10) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== parseInt(cpf[9], 10)) return false
  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i], 10) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== parseInt(cpf[10], 10)) return false
  return true
}

function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

// converte "dd/mm" em "2000-mm-dd" (ano fixo, nao expoe a idade).
// retorna null se o formato/data forem invalidos.
function parseDataNascimento(texto) {
  const m = texto.match(/^(\\d{1,2})\\/(\\d{1,2})$/)
  if (!m) return null
  const dia = parseInt(m[1], 10)
  const mes = parseInt(m[2], 10)
  if (mes < 1 || mes > 12) return null
  const diasNoMes = new Date(2000, mes, 0).getDate()
  if (dia < 1 || dia > diasNoMes) return null
  const dd = String(dia).padStart(2, '0')
  const mm = String(mes).padStart(2, '0')
  return '2000-' + mm + '-' + dd
}

function extrairErro(e) {
  return (
    (e && e.response && e.response.body && (e.response.body.message || e.response.body.error_description)) ||
    (e && e.message) ||
    'erro desconhecido'
  )
}

const MENU_TEXTO =
  '*Menu Clube HN*\\n' +
  '1 - Consultar saldo de pontos\\n' +
  '2 - Resgatar cupom\\n' +
  '3 - Meus cupons ativos\\n' +
  '4 - Historico de transacoes\\n' +
  '5 - Ajuda\\n\\n' +
  'Envie o numero da opcao desejada.'

const AJUDA_TEXTO =
  '*Ajuda - Clube HN*\\n\\n' +
  'Voce pode enviar a qualquer momento:\\n' +
  '- *menu* para voltar ao menu principal\\n' +
  '- *1* para consultar seu saldo de pontos\\n' +
  '- *2* para resgatar um cupom com seus pontos\\n' +
  '- *3* para ver seus cupons ativos\\n' +
  '- *4* para ver seu historico de transacoes\\n' +
  '- *5* para ver esta ajuda novamente\\n\\n' +
  'Duvidas? Fale com a equipe do parceiro participante.\\n\\n' +
  MENU_TEXTO

const input = $('Extrair Mensagem').first().json
const telefone = input.telefone
const texto = (input.texto || '').trim()
const textoLower = texto.toLowerCase()
const pushName = input.pushName || ''

let sessao = {}
const sessaoRaw = $input.first().json.sessaoRaw
if (sessaoRaw) {
  try {
    sessao = JSON.parse(sessaoRaw)
  } catch (e) {
    sessao = {}
  }
}

let estado = sessao.estado
let dados = sessao.dados || {}
let resposta = ''

const membros = await supaGet(
  'membros?telefone=eq.' +
    encodeURIComponent(telefone) +
    '&select=id,nome,pontos_saldo,pontos_acumulados_total,nivel,origem_parceiro_id'
)
let membro = Array.isArray(membros) && membros[0] ? membros[0] : null

if (!membro) {
  // ------------------------------------------------------------
  // 1) CADASTRO DE NOVO MEMBRO (coleta nome + CPF, valida, cria)
  // ------------------------------------------------------------
  if (estado === 'CADASTRO_CPF') {
    const cpf = texto.replace(/\\D/g, '')
    if (!validarCPF(cpf)) {
      resposta = 'CPF invalido. Envie novamente apenas os numeros do seu CPF (11 digitos).'
      estado = 'CADASTRO_CPF'
    } else {
      dados = Object.assign({}, dados, { cpf })
      resposta =
        'Falta pouco! Qual o dia e o mes do seu aniversario? Envie no formato dd/mm (ex: 25/03).\\n' +
        'Se preferir nao informar, envie "pular".'
      estado = 'CADASTRO_NASCIMENTO'
    }
  } else if (estado === 'CADASTRO_NASCIMENTO') {
    // ------------------------------------------------------------
    // 1b) CADASTRO - data de nascimento (opcional, apenas dia/mes)
    // ------------------------------------------------------------
    let dataValida = true
    let dataNascimento = null

    if (textoLower !== 'pular') {
      dataNascimento = parseDataNascimento(texto)
      if (!dataNascimento) dataValida = false
    }

    if (!dataValida) {
      resposta = 'Nao entendi essa data. Envie no formato dd/mm (ex: 25/03) ou "pular" para nao informar.'
      estado = 'CADASTRO_NASCIMENTO'
    } else {
      try {
        const novos = await supaPost('membros', {
          nome: dados.nome,
          cpf: dados.cpf,
          telefone,
          data_nascimento: dataNascimento,
        })
        const novo = Array.isArray(novos) ? novos[0] : novos
        resposta = 'Cadastro concluido, ' + novo.nome + '! Bem-vindo ao Clube HN.\\n\\n' + MENU_TEXTO
        estado = 'MENU'
        dados = {}
      } catch (e) {
        resposta = 'Nao foi possivel concluir seu cadastro (' + extrairErro(e) + '). Envie seu CPF novamente.'
        estado = 'CADASTRO_CPF'
      }
    }
  } else if (estado === 'CADASTRO_NOME' && texto) {
    dados = { nome: texto }
    resposta = 'Prazer, ' + texto + '! Agora envie seu CPF (apenas numeros).'
    estado = 'CADASTRO_CPF'
  } else {
    resposta =
      'Ola' +
      (pushName ? ', ' + pushName : '') +
      '! Bem-vindo ao Clube HN.\\n\\n' +
      'Voce ainda nao esta cadastrado. Qual o seu nome completo?'
    estado = 'CADASTRO_NOME'
    dados = {}
  }
} else {
  // ------------------------------------------------------------
  // Membro ja cadastrado - "menu" sempre volta ao menu principal
  // ------------------------------------------------------------
  if (textoLower === 'menu') {
    resposta = MENU_TEXTO
    estado = 'MENU'
    dados = {}
  } else if (estado === 'RESGATE_ESCOLHA' && Array.isArray(dados.niveis)) {
    // ------------------------------------------------------------
    // 4) RESGATE DE CUPOM - confirmacao da escolha + geracao via RPC
    // ------------------------------------------------------------
    const escolha = parseInt(texto, 10)
    if (!Number.isInteger(escolha) || escolha < 1 || escolha > dados.niveis.length) {
      resposta = 'Opcao invalida. Envie o numero correspondente ao cupom desejado, ou "menu" para voltar.'
    } else {
      const nivelEscolhido = dados.niveis[escolha - 1]
      try {
        const resultado = await supaRpc('gerar_cupom_membro', {
          p_membro_id: membro.id,
          p_cupom_nivel_id: nivelEscolhido.id,
        })
        const r = Array.isArray(resultado) ? resultado[0] : resultado
        resposta =
          'Cupom gerado com sucesso!\\n\\n' +
          'Beneficio: ' + r.nivel_nome + '\\n' +
          'Codigo: ' + r.codigo + '\\n' +
          'Valido ate: ' + formatarData(r.data_validade) + '\\n' +
          'Pontos utilizados: ' + r.pontos_utilizados + '\\n' +
          'Saldo atual: ' + r.saldo_atual + ' pontos\\n\\n' +
          'Apresente o codigo no parceiro para utilizar o beneficio.\\n\\n' +
          MENU_TEXTO
      } catch (e) {
        resposta = 'Nao foi possivel gerar o cupom (' + extrairErro(e) + ').\\n\\n' + MENU_TEXTO
      }
      estado = 'MENU'
      dados = {}
    }
  } else {
    // ------------------------------------------------------------
    // 2) MENU PRINCIPAL
    // ------------------------------------------------------------
    switch (texto) {
      case '1': {
        // ------------------------------------------------------
        // 3) CONSULTA DE SALDO + PROXIMO NIVEL DE CUPOM
        // ------------------------------------------------------
        const filtroParceiro = membro.origem_parceiro_id
          ? 'or=(parceiro_id.is.null,parceiro_id.eq.' + membro.origem_parceiro_id + ')'
          : 'parceiro_id=is.null'

        const proximos = await supaGet(
          'cupom_niveis?ativo=eq.true&pontos_necessarios=gt.' +
            membro.pontos_saldo +
            '&' + filtroParceiro +
            '&order=pontos_necessarios.asc&limit=1'
        )

        let proximoTexto
        if (Array.isArray(proximos) && proximos[0]) {
          const faltam = proximos[0].pontos_necessarios - membro.pontos_saldo
          proximoTexto = 'Faltam ' + faltam + ' pontos para o cupom "' + proximos[0].nome + '".'
        } else {
          proximoTexto = 'Voce ja pode resgatar todos os cupons disponiveis!'
        }

        resposta =
          'Seu saldo: ' + membro.pontos_saldo + ' pontos\\n' +
          'Nivel: ' + membro.nivel + '\\n' +
          'Total acumulado: ' + membro.pontos_acumulados_total + ' pontos\\n\\n' +
          proximoTexto + '\\n\\n' +
          MENU_TEXTO
        estado = 'MENU'
        break
      }
      case '2': {
        // ------------------------------------------------------
        // 4) RESGATE DE CUPOM - listagem dos niveis disponiveis
        // ------------------------------------------------------
        const filtroParceiro = membro.origem_parceiro_id
          ? 'or=(parceiro_id.is.null,parceiro_id.eq.' + membro.origem_parceiro_id + ')'
          : 'parceiro_id=is.null'

        const niveis = await supaGet(
          'cupom_niveis?ativo=eq.true&pontos_necessarios=lte.' +
            membro.pontos_saldo +
            '&' + filtroParceiro +
            '&order=pontos_necessarios.desc'
        )

        if (!Array.isArray(niveis) || niveis.length === 0) {
          resposta =
            'Voce ainda nao tem pontos suficientes para nenhum cupom disponivel.\\n' +
            'Seu saldo atual e ' + membro.pontos_saldo + ' pontos.\\n\\n' +
            MENU_TEXTO
          estado = 'MENU'
        } else {
          const lista = niveis
            .map((n, i) => (i + 1) + ' - ' + n.nome + ' (' + n.pontos_necessarios + ' pontos)')
            .join('\\n')
          resposta =
            'Cupons disponiveis para o seu saldo (' + membro.pontos_saldo + ' pontos):\\n\\n' +
            lista + '\\n\\n' +
            'Envie o numero do cupom que deseja resgatar, ou "menu" para voltar.'
          estado = 'RESGATE_ESCOLHA'
          dados = { niveis: niveis.map((n) => ({ id: n.id, nome: n.nome })) }
        }
        break
      }
      case '3': {
        // ------------------------------------------------------
        // 5) LISTAGEM DE CUPONS ATIVOS
        // ------------------------------------------------------
        const cupons = await supaGet(
          'cupons?membro_id=eq.' + membro.id +
            '&status=eq.disponivel&select=codigo,data_validade,pontos_utilizados,cupom_niveis(nome)' +
            '&order=data_validade.asc'
        )

        if (!Array.isArray(cupons) || cupons.length === 0) {
          resposta = 'Voce nao tem cupons ativos no momento.\\n\\n' + MENU_TEXTO
        } else {
          const lista = cupons
            .map((c) => {
              const nome = (c.cupom_niveis && c.cupom_niveis.nome) || 'Cupom'
              return nome + '\\nCodigo: ' + c.codigo + '\\nValido ate: ' + formatarData(c.data_validade)
            })
            .join('\\n\\n')
          resposta = 'Seus cupons ativos:\\n\\n' + lista + '\\n\\n' + MENU_TEXTO
        }
        estado = 'MENU'
        break
      }
      case '4': {
        // ------------------------------------------------------
        // 6) HISTORICO DE TRANSACOES
        // ------------------------------------------------------
        const transacoes = await supaGet(
          'transacoes?membro_id=eq.' + membro.id +
            '&select=tipo,pontos,valor_compra,descricao,created_at' +
            '&order=created_at.desc&limit=10'
        )

        if (!Array.isArray(transacoes) || transacoes.length === 0) {
          resposta = 'Voce ainda nao tem transacoes registradas.\\n\\n' + MENU_TEXTO
        } else {
          const tipoLabel = { credito: 'Credito', debito: 'Debito', ajuste: 'Ajuste', resgate: 'Resgate' }
          const lista = transacoes
            .map((t) => {
              const valor = (t.tipo === 'debito' || t.tipo === 'resgate') ? -t.pontos : t.pontos
              const sinal = valor >= 0 ? '+' : ''
              return formatarData(t.created_at) + ' - ' + sinal + valor + ' pts (' + (tipoLabel[t.tipo] || t.tipo) + ')'
            })
            .join('\\n')
          resposta = 'Suas ultimas transacoes:\\n\\n' + lista + '\\n\\n' + MENU_TEXTO
        }
        estado = 'MENU'
        break
      }
      case '5': {
        // ------------------------------------------------------
        // 7) MENSAGEM DE AJUDA
        // ------------------------------------------------------
        resposta = AJUDA_TEXTO
        estado = 'MENU'
        break
      }
      default: {
        resposta = 'Nao entendi essa opcao.\\n\\n' + MENU_TEXTO
        estado = 'MENU'
      }
    }
  }
}

return [
  {
    json: {
      telefone,
      resposta,
      novoEstado: estado,
      novosDados: dados,
    },
  },
]
`.trim()

const workflow = {
  name: 'Clube HN - Bot WhatsApp',
  nodes: [
    {
      parameters: {
        content:
          '## Clube HN - Bot WhatsApp (Fase 3)\n\n' +
          'Variaveis de ambiente do n8n necessarias:\n' +
          '- `CLUBE_SUPABASE_URL`\n' +
          '- `CLUBE_SUPABASE_SERVICE_KEY`\n' +
          '- `EVOLUTION_API_URL` (ex: https://n8n-evolution-api.k41knm.easypanel.host)\n' +
          '- `EVOLUTION_API_KEY` (apikey global da Evolution API)\n' +
          '- `EVOLUTION_INSTANCE` (nome da instancia do WhatsApp)\n\n' +
          'Sessao da conversa fica salva no Redis com TTL de 30 min,\n' +
          'chave `clube:sessao:<telefone>`.',
      },
      id: 'sticky-overview',
      name: 'Visao Geral',
      type: 'n8n-nodes-base.stickyNote',
      typeVersion: 1,
      position: [-480, -340],
    },
    {
      parameters: {
        content:
          '### Fluxos implementados no node "Motor de Conversa"\n\n' +
          '1. Cadastro de novo membro (nome + CPF + data de nascimento opcional dd/mm)\n' +
          '2. Menu principal\n' +
          '3. Consulta de saldo + proximo nivel\n' +
          '4. Resgate de cupom (lista + escolha + RPC gerar_cupom_membro)\n' +
          '5. Listagem de cupons ativos\n' +
          '6. Historico de transacoes\n' +
          '7. Mensagem de ajuda\n\n' +
          'Estados de conversa: CADASTRO_NOME, CADASTRO_CPF, CADASTRO_NASCIMENTO, MENU, RESGATE_ESCOLHA',
      },
      id: 'sticky-flows',
      name: 'Fluxos',
      type: 'n8n-nodes-base.stickyNote',
      typeVersion: 1,
      position: [560, -340],
    },
    {
      parameters: {
        httpMethod: 'POST',
        path: 'clube-hn-bot',
        responseMode: 'onReceived',
        options: {},
      },
      id: 'webhook-evolution',
      name: 'Webhook Evolution API',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [-480, 0],
      webhookId: 'clube-hn-bot-whatsapp',
    },
    {
      parameters: {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: extrairMensagemCode,
      },
      id: 'code-extrair-mensagem',
      name: 'Extrair Mensagem',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [-260, 0],
    },
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'strict',
          },
          conditions: [
            {
              id: 'cond-valido',
              leftValue: '={{ $json.valido }}',
              rightValue: true,
              operator: { type: 'boolean', operation: 'equals' },
            },
          ],
          combinator: 'and',
        },
        options: {},
      },
      id: 'if-mensagem-valida',
      name: 'Mensagem Valida?',
      type: 'n8n-nodes-base.if',
      typeVersion: 2,
      position: [-40, 0],
    },
    {
      parameters: {},
      id: 'noop-ignorar',
      name: 'Ignorar',
      type: 'n8n-nodes-base.noOp',
      typeVersion: 1,
      position: [180, 140],
    },
    {
      parameters: {
        operation: 'get',
        key: '=clube:sessao:{{$json.telefone}}',
        propertyName: 'sessaoRaw',
        options: {},
      },
      id: 'redis-get-sessao',
      name: 'Buscar Sessao (Redis)',
      type: 'n8n-nodes-base.redis',
      typeVersion: 1,
      position: [180, -120],
      credentials: {
        redis: {
          id: 'REDIS_CREDENTIAL_ID',
          name: 'Redis Clube HN',
        },
      },
    },
    {
      parameters: {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: motorConversaCode,
      },
      id: 'code-motor-conversa',
      name: 'Motor de Conversa',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [400, -120],
    },
    {
      parameters: {
        operation: 'set',
        key: '=clube:sessao:{{$("Extrair Mensagem").first().json.telefone}}',
        value: '={{ JSON.stringify({ estado: $json.novoEstado, dados: $json.novosDados }) }}',
        expire: true,
        ttl: 1800,
        options: {},
      },
      id: 'redis-set-sessao',
      name: 'Salvar Sessao (Redis)',
      type: 'n8n-nodes-base.redis',
      typeVersion: 1,
      position: [620, -120],
      credentials: {
        redis: {
          id: 'REDIS_CREDENTIAL_ID',
          name: 'Redis Clube HN',
        },
      },
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
        jsonBody:
          '={{ JSON.stringify({ number: $("Extrair Mensagem").first().json.telefone, text: $json.resposta }) }}',
        options: {},
      },
      id: 'http-enviar-resposta',
      name: 'Enviar Resposta WhatsApp',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [840, -120],
    },
  ],
  connections: {
    'Webhook Evolution API': {
      main: [[{ node: 'Extrair Mensagem', type: 'main', index: 0 }]],
    },
    'Extrair Mensagem': {
      main: [[{ node: 'Mensagem Valida?', type: 'main', index: 0 }]],
    },
    'Mensagem Valida?': {
      main: [
        [{ node: 'Buscar Sessao (Redis)', type: 'main', index: 0 }],
        [{ node: 'Ignorar', type: 'main', index: 0 }],
      ],
    },
    'Buscar Sessao (Redis)': {
      main: [[{ node: 'Motor de Conversa', type: 'main', index: 0 }]],
    },
    'Motor de Conversa': {
      main: [[{ node: 'Salvar Sessao (Redis)', type: 'main', index: 0 }]],
    },
    'Salvar Sessao (Redis)': {
      main: [[{ node: 'Enviar Resposta WhatsApp', type: 'main', index: 0 }]],
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
const outPath = path.join(outDir, 'clube-hn-bot-whatsapp.json')
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2) + '\n', 'utf8')
console.log('Gerado:', outPath)
