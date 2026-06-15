# Migrations — observacoes

## `membros.data_nascimento` usa ano placeholder (2000)

A coluna `data_nascimento` (tabela `membros`) e do tipo `DATE`, mas o objetivo
e armazenar apenas **dia e mes** de aniversario, sem expor o ano de nascimento
do membro (idade). Por isso, desde a migration `0011_membros_data_nascimento.sql`,
todo valor gravado nessa coluna usa o ano fixo **2000** (ano bissexto, permite
29/02), garantido por uma check constraint:

```sql
alter table public.membros
  add constraint membros_data_nascimento_ano_fixo
  check (data_nascimento is null or extract(year from data_nascimento) = 2000);
```

O codigo da aplicacao segue essa convencao em
[`src/app/admin/membros/[id]/actions.ts`](../../src/app/admin/membros/[id]/actions.ts)
(funcao `atualizarMembro`), onde o valor e montado como `2000-MM-DD` com um
comentario explicando que o ano e apenas um placeholder.

### Migration futura recomendada

A abordagem com `DATE` + ano fixo funciona, mas e fragil (depende da check
constraint e de todo codigo respeitar a convencao). Uma migration futura
deveria substituir `data_nascimento` por duas colunas dedicadas:

```sql
alter table public.membros
  add column dia_nasc smallint check (dia_nasc between 1 and 31),
  add column mes_nasc smallint check (mes_nasc between 1 and 12);

-- migrar dados existentes
update public.membros
set dia_nasc = extract(day from data_nascimento),
    mes_nasc = extract(month from data_nascimento)
where data_nascimento is not null;

-- depois de atualizar o codigo da aplicacao e a RPC
-- membros_aniversariantes_mes para usar dia_nasc/mes_nasc:
alter table public.membros
  drop constraint membros_data_nascimento_ano_fixo,
  drop column data_nascimento;
```

Isso elimina a dependencia do ano 2000 como placeholder e deixa a intencao
("apenas dia e mes importam") explicita no schema.

## RPC `membros_aniversariantes_mes`

Definida em `0011_membros_data_nascimento.sql`. A query atual:

```sql
select m.id, m.telefone
from public.membros m
where m.ativo = true
  and m.data_nascimento is not null
  and extract(month from m.data_nascimento) = extract(month from now());
```

Ja usa `EXTRACT(MONTH FROM ...)` em vez de comparar a data inteira (o que
evitaria o problema do ano fixo influenciar o resultado). Nao ha bug aqui —
a comparacao por ano nunca e feita. Caso a migration acima seja aplicada,
essa funcao deve ser atualizada para `where m.mes_nasc = extract(month from now())`.
