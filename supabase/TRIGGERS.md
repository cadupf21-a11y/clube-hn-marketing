# Triggers do banco de dados (Supabase)

Este documento lista os triggers necessarios para o funcionamento do
Clube HN. Para cada um: nome, tabela, evento, funcao chamada e logica
esperada. Tambem indica se o trigger **ja existe** nas migrations
(`supabase/migrations/`) ou se ainda **precisa ser criado**.

---

## 1. Atualizar `membros.pontos_saldo` e `membros.pontos_acumulados_total`

**Status:** ✅ Implementado (`supabase/migrations/0001_init_schema.sql`)

| | |
|---|---|
| Trigger | `trg_transacoes_aplicar_pontos` |
| Tabela | `public.transacoes` |
| Evento | `AFTER INSERT` (`for each row`) |
| Funcao | `public.aplicar_transacao_pontos()` |

### Logica esperada (e implementada)

A cada nova linha inserida em `transacoes`:

- Se `tipo` for `'credito'` ou `'ajuste'`:
  - `pontos_saldo += new.pontos`
  - `pontos_acumulados_total += new.pontos`, **somente se** `new.pontos > 0`
    (ajustes negativos nao reduzem o total acumulado historico, apenas o saldo)
- Se `tipo` for `'debito'` ou `'resgate'`:
  - `pontos_saldo -= new.pontos`
  - `pontos_acumulados_total` permanece inalterado

A funcao roda com `security definer` (bypassa RLS) para poder
atualizar a linha de `membros` a partir de um insert feito pelo
parceiro autenticado.

```sql
create or replace function public.aplicar_transacao_pontos()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.tipo in ('credito', 'ajuste') then
    update public.membros
      set pontos_saldo = pontos_saldo + new.pontos,
          pontos_acumulados_total = case when new.pontos > 0
            then pontos_acumulados_total + new.pontos
            else pontos_acumulados_total
          end
      where id = new.membro_id;
  elsif new.tipo in ('debito', 'resgate') then
    update public.membros
      set pontos_saldo = pontos_saldo - new.pontos
      where id = new.membro_id;
  end if;
  return new;
end;
$$;

create trigger trg_transacoes_aplicar_pontos
  after insert on public.transacoes
  for each row execute procedure public.aplicar_transacao_pontos();
```

---

## 2. Atualizar `membros.nivel` com base em `pontos_acumulados_total`

**Status:** ❌ Pendente — nao existe em nenhuma migration. A coluna
`membros.nivel` (`text not null default 'bronze'`, criada em
`0001_init_schema.sql`) e exibida na UI (`/admin/membros`,
"Nivel": `m.nivel`), mas hoje **nunca e atualizada** apos o cadastro do
membro. Proposta abaixo.

| | |
|---|---|
| Trigger | `trg_membros_atualizar_nivel` (proposto) |
| Tabela | `public.membros` |
| Evento | `AFTER UPDATE OF pontos_acumulados_total` (ou `BEFORE UPDATE`, ver nota) |
| Funcao | `public.atualizar_nivel_membro()` (proposta) |

### Logica esperada

1. Sempre que `pontos_acumulados_total` mudar (tipicamente apos
   `trg_transacoes_aplicar_pontos` rodar um `UPDATE` em `membros`), a
   funcao deve recalcular `nivel`.
2. A progressao de niveis usa `cupom_niveis.pontos_necessarios` como
   referencia: os niveis globais do clube (`cupom_niveis.parceiro_id is
   null`, `ativo = true`) sao ordenados por `pontos_necessarios` e o
   `nivel` do membro passa a ser o **nome** do maior nivel cujo
   `pontos_necessarios <= membros.pontos_acumulados_total`.
3. Se `pontos_acumulados_total` for menor que o `pontos_necessarios` do
   primeiro nivel cadastrado (ou nao houver niveis globais
   cadastrados), `nivel` permanece `'bronze'` (valor padrao da coluna).

### Implementacao proposta

```sql
create or replace function public.atualizar_nivel_membro()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_nivel text;
begin
  select cn.nome into v_nivel
  from public.cupom_niveis cn
  where cn.parceiro_id is null
    and cn.ativo = true
    and cn.pontos_necessarios <= new.pontos_acumulados_total
  order by cn.pontos_necessarios desc
  limit 1;

  new.nivel := coalesce(v_nivel, 'bronze');
  return new;
end;
$$;

-- BEFORE UPDATE para poder sobrescrever new.nivel na mesma transacao
create trigger trg_membros_atualizar_nivel
  before update of pontos_acumulados_total on public.membros
  for each row execute procedure public.atualizar_nivel_membro();
```

> **Nota:** usar `BEFORE UPDATE OF pontos_acumulados_total` (em vez de
> `AFTER`) permite alterar `new.nivel` no mesmo `UPDATE` ja disparado
> por `trg_transacoes_aplicar_pontos`, sem precisar de um segundo
> `UPDATE` (evitando recursao de triggers). A condicao `OF
> pontos_acumulados_total` garante que o trigger so roda quando esse
> campo especifico e alterado.

---

## 3. Atualizar `updated_at` em `parceiros` e `membros`

**Status:** ✅ Implementado (`supabase/migrations/0001_init_schema.sql`),
via funcao equivalente ao `moddatetime`.

| | |
|---|---|
| Triggers | `trg_parceiros_updated_at`, `trg_membros_updated_at` |
| Tabelas | `public.parceiros`, `public.membros` |
| Evento | `BEFORE UPDATE` (`for each row`) |
| Funcao | `public.set_updated_at()` |

### Logica esperada (e implementada)

A funcao generica `set_updated_at()` define `new.updated_at = now()`
antes de qualquer `UPDATE` na linha, equivalente ao extension
`moddatetime`:

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_parceiros_updated_at
  before update on public.parceiros
  for each row execute procedure public.set_updated_at();

create trigger trg_membros_updated_at
  before update on public.membros
  for each row execute procedure public.set_updated_at();
```

> Outras tabelas com coluna `updated_at` (atualmente nenhuma alem de
> `parceiros` e `membros`) devem reutilizar a mesma funcao
> `set_updated_at()` ao adicionar o respectivo trigger.
