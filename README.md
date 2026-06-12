# Clube HN Marketing

Sistema de fidelidade do Clube HN — Next.js 14 (App Router) + Supabase + Tailwind CSS.

## Setup

1. Crie um projeto no [Supabase](https://supabase.com).
2. Copie `.env.local.example` para `.env.local` e preencha com as chaves do projeto
   (Project Settings -> API): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   e `SUPABASE_SERVICE_ROLE_KEY`.
3. Rode a migration `supabase/migrations/0001_init_schema.sql` no SQL Editor do Supabase
   (ou via `supabase db push` se estiver usando a CLI).
4. Instale as dependencias e rode o projeto:

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Perfis de acesso

- **Admin HN** (`role = 'admin'` em `perfis`): acesso total, gerencia parceiros,
  membros, niveis de cupom globais e disparos. Rotas em `/admin`.
- **Dono parceiro** (`role = 'parceiro'` em `perfis`, com `parceiro_id`): gerencia
  o proprio estabelecimento — membros, transacoes, cupons, niveis de cupom,
  atendentes e disparos. Rotas em `/parceiro`.
- **Atendente (PIN)**: nao possui usuario no Supabase Auth. O dono parceiro
  cadastra atendentes com um PIN de 4 a 6 digitos em `/parceiro/atendentes`.
  No caixa, o atendente se identifica em `/atendente` e o PDV (`/pdv`) fica
  liberado para lancar pontos das compras.

### Criando o primeiro usuario admin

No painel do Supabase, va em Authentication -> Users -> Add user e defina,
em "User Metadata", o JSON:

```json
{ "nome": "Admin HN", "role": "admin" }
```

Um trigger (`handle_new_user`) cria automaticamente o registro correspondente
em `perfis`. Para criar o dono de um parceiro, use:

```json
{ "nome": "Dono do Parceiro X", "role": "parceiro", "parceiro_id": "<uuid-do-parceiro>" }
```

## Schema (Supabase / Postgres)

Tabelas principais (`supabase/migrations/0001_init_schema.sql`):

- `parceiros` — estabelecimentos parceiros do clube.
- `perfis` — admin HN e donos de parceiros (1:1 com `auth.users`).
- `atendentes` — funcionarios com login por PIN, vinculados a um parceiro.
- `membros` — clientes do clube de fidelidade (cadastro compartilhado).
- `cupom_niveis` — niveis/recompensas resgataveis por pontos (globais ou por parceiro).
- `cupons` — cupons emitidos para membros a partir de um `cupom_nivel`.
- `transacoes` — ledger de pontos (credito, debito, ajuste, resgate).
- `disparos` — campanhas de marketing (whatsapp, email, sms, push).

Todas as tabelas tem Row Level Security habilitado, com policies separadas
para admin HN e donos de parceiro.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
