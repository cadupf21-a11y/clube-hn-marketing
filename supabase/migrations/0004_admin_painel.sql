-- ============================================================
-- PAINEL ADMIN HN (Fase 4)
-- Novas colunas em parceiros, tabelas de configuracao/financeiro
-- e RPCs auxiliares para o painel administrativo.
-- ============================================================

-- PARCEIROS: teto mensal de pontos e whatsapp de contato
alter table public.parceiros
  add column if not exists teto_pontos_mensal integer,
  add column if not exists whatsapp text;

-- ============================================================
-- CUPOM_NIVEIS <-> PARCEIROS (parceiros aceitos por nivel)
-- Sem nenhuma linha aqui = nivel global aceito por todos os
-- parceiros (comportamento atual). Com linhas = somente os
-- parceiros listados aceitam o nivel.
-- ============================================================

create table public.cupom_nivel_parceiros (
  cupom_nivel_id uuid not null references public.cupom_niveis(id) on delete cascade,
  parceiro_id uuid not null references public.parceiros(id) on delete cascade,
  primary key (cupom_nivel_id, parceiro_id)
);

alter table public.cupom_nivel_parceiros enable row level security;

create policy "admin gerencia cupom_nivel_parceiros" on public.cupom_nivel_parceiros
  for all using (public.is_admin()) with check (public.is_admin());

create policy "parceiro ve seus vinculos de niveis" on public.cupom_nivel_parceiros
  for select using (parceiro_id = public.current_parceiro_id());

-- ============================================================
-- PLANOS (financeiro)
-- ============================================================

create table public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor_mensal numeric(10,2) not null check (valor_mensal >= 0),
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.planos enable row level security;

create policy "admin gerencia planos" on public.planos
  for all using (public.is_admin()) with check (public.is_admin());

create policy "parceiro ve planos ativos" on public.planos
  for select using (public.is_parceiro());

-- ============================================================
-- MENSALIDADES (cobranca recorrente por parceiro)
-- ============================================================

create table public.mensalidades (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros(id) on delete cascade,
  plano_id uuid references public.planos(id) on delete set null,
  competencia date not null,
  valor numeric(10,2) not null check (valor >= 0),
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado', 'cancelado')),
  vencimento date not null,
  pago_em timestamptz,
  observacao text,
  created_at timestamptz not null default now()
);

create unique index idx_mensalidades_parceiro_competencia on public.mensalidades(parceiro_id, competencia);
create index idx_mensalidades_parceiro_id on public.mensalidades(parceiro_id);
create index idx_mensalidades_status on public.mensalidades(status);

alter table public.mensalidades enable row level security;

create policy "admin gerencia mensalidades" on public.mensalidades
  for all using (public.is_admin()) with check (public.is_admin());

create policy "parceiro ve suas mensalidades" on public.mensalidades
  for select using (parceiro_id = public.current_parceiro_id());

-- ============================================================
-- RPC: ajuste manual de pontos de um membro (admin)
-- ============================================================

create or replace function public.admin_ajustar_pontos(
  p_membro_id uuid,
  p_parceiro_id uuid,
  p_pontos integer,
  p_descricao text
)
returns public.membros
language plpgsql
security definer set search_path = public
as $$
declare
  v_membro public.membros;
begin
  if not public.is_admin() then
    raise exception 'apenas administradores podem ajustar pontos';
  end if;

  if p_pontos = 0 then
    raise exception 'informe uma quantidade de pontos diferente de zero';
  end if;

  insert into public.transacoes (membro_id, parceiro_id, tipo, pontos, descricao)
  values (p_membro_id, p_parceiro_id, 'ajuste', p_pontos, coalesce(nullif(p_descricao, ''), 'Ajuste manual (admin)'));

  select * into v_membro from public.membros where id = p_membro_id;
  return v_membro;
end;
$$;

grant execute on function public.admin_ajustar_pontos(uuid, uuid, integer, text) to authenticated;

-- ============================================================
-- RPC: emissao manual de cupom (admin)
-- ============================================================

create or replace function public.admin_emitir_cupom(
  p_membro_id uuid,
  p_cupom_nivel_id uuid,
  p_parceiro_id uuid
)
returns public.cupons
language plpgsql
security definer set search_path = public
as $$
declare
  v_nivel public.cupom_niveis%rowtype;
  v_codigo text;
  v_cupom public.cupons;
begin
  if not public.is_admin() then
    raise exception 'apenas administradores podem emitir cupons manualmente';
  end if;

  select * into v_nivel from public.cupom_niveis where id = p_cupom_nivel_id;
  if not found then
    raise exception 'nivel de cupom nao encontrado';
  end if;

  v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.cupons (membro_id, cupom_nivel_id, parceiro_id, codigo, status, pontos_utilizados, data_validade)
  values (
    p_membro_id, p_cupom_nivel_id, p_parceiro_id, v_codigo, 'disponivel',
    v_nivel.pontos_necessarios, now() + (v_nivel.validade_dias || ' days')::interval
  )
  returning * into v_cupom;

  return v_cupom;
end;
$$;

grant execute on function public.admin_emitir_cupom(uuid, uuid, uuid) to authenticated;

-- ============================================================
-- RPC: estatisticas do dashboard admin
-- ============================================================

create or replace function public.admin_dashboard_stats()
returns table (
  membros_ativos bigint,
  pontos_gerados_hoje bigint,
  cupons_ativos bigint,
  resgates_hoje bigint
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'apenas administradores podem ver as estatisticas';
  end if;

  return query
    select
      (select count(*) from public.membros where ativo) as membros_ativos,
      (select coalesce(sum(t.pontos), 0) from public.transacoes t
         where t.tipo = 'credito' and t.created_at >= date_trunc('day', now())) as pontos_gerados_hoje,
      (select count(*) from public.cupons where status = 'disponivel') as cupons_ativos,
      (select count(*) from public.cupons where data_resgate >= date_trunc('day', now())) as resgates_hoje;
end;
$$;

grant execute on function public.admin_dashboard_stats() to authenticated;

-- ============================================================
-- RPC: ranking de parceiros por pontos gerados
-- ============================================================

create or replace function public.admin_ranking_parceiros(p_limite integer default 10)
returns table (
  parceiro_id uuid,
  nome text,
  pontos_gerados bigint,
  total_transacoes bigint,
  cupons_resgatados bigint
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'apenas administradores podem ver o ranking';
  end if;

  return query
    select
      p.id,
      p.nome,
      coalesce(sum(t.pontos) filter (where t.tipo = 'credito'), 0) as pontos_gerados,
      count(t.id) as total_transacoes,
      coalesce((
        select count(*) from public.cupons c
        where c.parceiro_id = p.id and c.status = 'resgatado'
      ), 0) as cupons_resgatados
    from public.parceiros p
    left join public.transacoes t on t.parceiro_id = p.id
    group by p.id, p.nome
    order by pontos_gerados desc
    limit p_limite;
end;
$$;

grant execute on function public.admin_ranking_parceiros(integer) to authenticated;
