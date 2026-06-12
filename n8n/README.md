# Clube HN - Bot WhatsApp (Fase 3)

Workflow n8n: [`clube-hn-bot-whatsapp.json`](./clube-hn-bot-whatsapp.json)
Gerado por: [`scripts/generate-n8n-workflow.js`](../scripts/generate-n8n-workflow.js)

Para alterar a logica, edite o gerador e rode novamente:

```bash
node scripts/generate-n8n-workflow.js
```

## Arquitetura

Um unico workflow recebe o webhook da Evolution API (evento `messages.upsert`),
mantem o estado da conversa no Redis e responde via API de envio de mensagens
da Evolution API.

```
Webhook (Evolution) -> Extrair Mensagem -> Mensagem Valida?
                                              |-> (nao) Ignorar
                                              `-> (sim) Buscar Sessao (Redis)
                                                          -> Motor de Conversa
                                                          -> Salvar Sessao (Redis)
                                                          -> Enviar Resposta WhatsApp
```

Todo o "motor de conversa" (os 7 fluxos pedidos na Fase 3) esta implementado em
JavaScript dentro do node **Motor de Conversa**, que chama a REST API do
Supabase (`/rest/v1/...`) com a service role key. Isso evita dezenas de nodes
HTTP/Switch separados e mantem o workflow facil de manter.

### Os 7 fluxos

1. **Cadastro de novo membro** - se o telefone nao existe em `membros`, o bot
   pergunta nome e depois CPF (validado com o algoritmo oficial), e cria o
   registro em `membros` (`telefone`, `nome`, `cpf`).
2. **Menu principal** - exibido sempre que o membro envia `menu` ou termina
   qualquer outra operacao.
3. **Consulta de saldo** - mostra `pontos_saldo`, `nivel`,
   `pontos_acumulados_total` e quantos pontos faltam para o proximo
   `cupom_niveis` (considerando niveis globais `parceiro_id is null` e os do
   `origem_parceiro_id` do membro).
4. **Resgate de cupom** - lista os `cupom_niveis` ativos com
   `pontos_necessarios <= pontos_saldo`; o membro escolhe um numero e o bot
   chama a RPC `gerar_cupom_membro(p_membro_id, p_cupom_nivel_id)` (criada na
   migration [`0003_bot_gerar_cupom.sql`](../supabase/migrations/0003_bot_gerar_cupom.sql)),
   que gera o codigo do cupom, debita os pontos e retorna o saldo atualizado.
5. **Listagem de cupons ativos** - cupons com `status = 'disponivel'` do
   membro, com codigo e validade.
6. **Historico de transacoes** - ultimas 10 linhas de `transacoes`.
7. **Ajuda** - lista de comandos disponiveis.

### Estados de conversa (Redis)

Chave: `clube:sessao:<telefone>` (TTL 1800s), valor JSON:

```json
{ "estado": "MENU", "dados": {} }
```

Estados possiveis: `CADASTRO_NOME`, `CADASTRO_CPF`, `MENU`, `RESGATE_ESCOLHA`.
Quando `estado` esta vazio (sessao nova), o bot consulta `membros` pelo
telefone para decidir entre iniciar o cadastro ou mostrar o menu.

## Configuracao necessaria no n8n

### Variaveis de ambiente (Settings > Environment variables, ou `.env` do n8n)

| Variavel | Valor |
| --- | --- |
| `CLUBE_SUPABASE_URL` | URL do projeto Supabase do Clube HN |
| `CLUBE_SUPABASE_SERVICE_KEY` | Service role key do projeto Supabase do Clube HN |
| `EVOLUTION_API_URL` | `https://n8n-evolution-api.k41knm.easypanel.host` |
| `EVOLUTION_API_KEY` | `429683C4C977415CAAFCCE10F7D57E11` (apikey global) |
| `EVOLUTION_INSTANCE` | nome da instancia do WhatsApp criada na Evolution API |

> A service role key ignora RLS - por isso o bot consegue ler/gravar em
> `membros`, `cupons`, `transacoes` e `cupom_niveis` diretamente via REST,
> sem depender dos perfis/roles usados pelo app Next.js.

### Credencial Redis

Crie uma credencial do tipo **Redis** chamada `Redis Clube HN` (host, porta,
senha do seu servidor Redis) e, apos importar o workflow, selecione essa
credencial nos nodes **Buscar Sessao (Redis)** e **Salvar Sessao (Redis)**.

### Webhook na Evolution API

Configure o webhook da instancia para o evento `MESSAGES_UPSERT` apontando
para a URL do node **Webhook Evolution API** (path `clube-hn-bot`), por
exemplo:

```
POST https://<seu-n8n>/webhook/clube-hn-bot
```

### Endpoint de envio

O node **Enviar Resposta WhatsApp** chama:

```
POST {{EVOLUTION_API_URL}}/message/sendText/{{EVOLUTION_INSTANCE}}
Header: apikey: {{EVOLUTION_API_KEY}}
Body: { "number": "<telefone>", "text": "<resposta>" }
```

Se a versao da sua Evolution API usar um payload diferente (ex:
`textMessage.text` em vez de `text`), ajuste o `jsonBody` desse node.

## Migration necessaria

Aplique [`supabase/migrations/0003_bot_gerar_cupom.sql`](../supabase/migrations/0003_bot_gerar_cupom.sql)
no projeto Supabase do clube antes de ativar o workflow - ela cria a funcao
`gerar_cupom_membro`, usada no fluxo 4.

## Observacao sobre formato de telefone

O bot usa o numero exatamente como recebido da Evolution API (apenas digitos,
com DDI), tanto para buscar quanto para cadastrar o membro em `membros`. Se o
PDV (Fase 2) cadastrar membros com telefone formatado de outra forma (ex:
`(11) 99999-9999`), o mesmo cliente pode acabar com dois registros distintos.
Vale padronizar o formato de `telefone` (somente digitos) nos dois fluxos.

---

# Clube HN - Relatorio Mensal por Parceiro (Fase 5)

Workflow n8n: [`clube-hn-relatorio-mensal.json`](./clube-hn-relatorio-mensal.json)
Gerado por: [`scripts/generate-relatorio-mensal-workflow.js`](../scripts/generate-relatorio-mensal-workflow.js)

Para alterar a logica, edite o gerador e rode novamente:

```bash
node scripts/generate-relatorio-mensal-workflow.js
```

## Arquitetura

```
Todo dia 1 as 8h (Schedule Trigger)
  -> Montar Relatorios (Code)
  -> Enviar Relatorio WhatsApp (HTTP Request, um por parceiro)
```

O node **Montar Relatorios** busca, via REST do Supabase
(`/rest/v1/parceiros?ativo=eq.true&whatsapp=not.is.null`), todos os parceiros
ativos com WhatsApp cadastrado. Para cada um, chama a RPC
`parceiro_relatorio_mensal(p_parceiro_id)` (criada na migration
[`0005_parceiro_painel.sql`](../supabase/migrations/0005_parceiro_painel.sql)),
que por padrao retorna os dados do **mes anterior** ao da execucao:

- `membros_ativos` - membros (ativos) com pelo menos uma transacao no
  estabelecimento no mes
- `novos_clientes` - novos cadastros no Clube HN com origem neste parceiro
- `total_transacoes` - quantidade de transacoes lancadas no mes
- `valor_movimentado` - soma de `valor_compra` das transacoes de credito
- `pontos_gerados` - soma de pontos creditados
- `cupons_resgatados` - cupons resgatados no mes
- `desconto_concedido` - soma de `valor_beneficio` dos cupons resgatados do
  tipo `desconto_valor`

O node monta uma mensagem de texto com esse resumo e o **Enviar Relatorio
WhatsApp** envia, um item por vez, para o numero `whatsapp` do parceiro via
Evolution API.

## Configuracao necessaria no n8n

Usa as mesmas variaveis de ambiente do bot (Fase 3):
`CLUBE_SUPABASE_URL`, `CLUBE_SUPABASE_SERVICE_KEY`, `EVOLUTION_API_URL`,
`EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`.

> A service role key bypassa RLS, mas a RPC `parceiro_relatorio_mensal`
> tambem libera a chamada para `service_role` explicitamente (alem de
> `is_admin()` e do proprio parceiro via `current_parceiro_id()`).

## Migration necessaria

Aplique [`supabase/migrations/0005_parceiro_painel.sql`](../supabase/migrations/0005_parceiro_painel.sql)
no projeto Supabase do clube antes de ativar o workflow - ela cria a funcao
`parceiro_relatorio_mensal`, alem das RPCs `parceiro_dashboard_stats` e
`parceiro_clientes` usadas pelo painel `/parceiro` (Fase 5).

## Pre-requisito de cadastro

So recebem o relatorio os parceiros com `ativo = true` e `whatsapp`
preenchido em `parceiros`. Garanta que o campo `whatsapp` esteja no formato
aceito pela Evolution API (apenas digitos, com DDI).

---

# Clube HN - Worker de Disparos (Fase 6)

Workflow n8n: [`clube-hn-disparos-worker.json`](./clube-hn-disparos-worker.json)
Gerado por: [`scripts/generate-disparos-worker-workflow.js`](../scripts/generate-disparos-worker-workflow.js)

Para alterar a logica, edite o gerador e rode novamente:

```bash
node scripts/generate-disparos-worker-workflow.js
```

## Arquitetura

```
A cada 5 minutos (Schedule Trigger)
  -> Processar Disparos Agendados (Code)
```

O node **Processar Disparos Agendados** busca, via REST do Supabase, todos os
registros de `disparos` com `status = 'agendado'` e
`agendado_para <= now()`. Para cada um:

1. Marca o disparo como `enviando` (`PATCH disparos`).
2. Resolve a lista de membros elegiveis a partir do campo `segmento` (jsonb).
3. Envia a `mensagem` via Evolution API (`POST /message/sendText/...`) para
   cada membro, aguardando um delay aleatorio de **2 a 5 segundos** entre
   cada envio (anti-ban).
4. Marca o disparo como `enviado`, com `enviado_em`, `total_destinatarios` e
   `total_enviados` (quantidade que retornou sucesso da Evolution API).

Se ocorrer um erro ao buscar os destinatarios ou ao atualizar o disparo, ele
volta para `status = 'agendado'` e sera reprocessado no proximo ciclo (5 min).
Falhas de envio individuais (por membro) sao ignoradas e nao interrompem o
restante da lista.

## Segmentacao (`disparos.segmento`)

O campo `segmento` (jsonb) controla o publico-alvo. Campo `tipo` define a
estrategia principal (default `'todos'`):

| `tipo` | Parametros adicionais | Publico |
| --- | --- | --- |
| `todos` (ou ausente) | - | Todos os membros ativos |
| `parceiro` | `parceiro_id` | Membros com `origem_parceiro_id = parceiro_id` |
| `inativos` | `dias_inativos` (default 30) | Membros sem transacao ha N dias (ou que nunca transacionaram) |
| `aniversariantes` | - | Membros com `data_nascimento` no mes atual |
| `saldo_minimo` | `saldo_minimo` | Membros com `pontos_saldo >= saldo_minimo` |
| `nunca_resgataram` | - | Membros sem nenhum cupom com `status = 'resgatado'` |

Os campos legados usados pelo formulario `/admin/disparos`
(`nivel`, `origem_parceiro_id`, `pontos_minimos`) continuam funcionando como
filtros adicionais, combinados com o `tipo` acima quando presentes.

Exemplos de `segmento`:

```json
{ "tipo": "todos" }
{ "tipo": "parceiro", "parceiro_id": "<uuid-do-parceiro>" }
{ "tipo": "inativos", "dias_inativos": 60 }
{ "tipo": "aniversariantes" }
{ "tipo": "saldo_minimo", "saldo_minimo": 100 }
{ "tipo": "nunca_resgataram" }
```

## Configuracao necessaria no n8n

Usa as mesmas variaveis de ambiente do bot (Fase 3) e do relatorio mensal
(Fase 5): `CLUBE_SUPABASE_URL`, `CLUBE_SUPABASE_SERVICE_KEY`,
`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`.

> A service role key bypassa RLS, permitindo ler `membros`, `transacoes`,
> `cupons` e atualizar `disparos` diretamente via REST.

## Convivencia com `/admin/disparos`

O painel admin ja permite criar disparos com acao "Enviar agora" (processado
na hora pelo Server Action) ou "Agendar envio" (status `agendado`). Este
worker complementa o segundo caso: ele e quem efetivamente processa os
disparos agendados, sem depender de alguem clicar em "Enviar agora" depois.
O botao "Enviar agora" da listagem `/admin/disparos` continua funcionando
para disparos `agendado` que o admin queira disparar manualmente antes do
horario - nesse caso o worker simplesmente nao encontrara mais o registro
com `status = 'agendado'` no proximo ciclo.
