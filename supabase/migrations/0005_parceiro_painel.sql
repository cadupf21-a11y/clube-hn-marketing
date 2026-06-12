-- ============================================================
-- Fase 5: Painel do Parceiro (/parceiro)
-- RPCs com estatisticas e listas escopadas ao proprio parceiro
-- (current_parceiro_id()), respeitando o que a RLS ja garante.
-- ============================================================

-- ============================================================
-- RPC: estatisticas do dashboard do parceiro
-- ============================================================

create or replace function public.parceiro_dashboard_stats()
returns table (
  membros_ativos bigint,
  pontos_gerados bigint,
  cupons_resgatados bigint,
  desconto_concedido numeric,
  novos_clientes_mes bigint
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_parceiro_id uuid;
begin
  if not public.is_parceiro() then
    raise exception 'apenas parceiros podem ver estas estatisticas';
  end if;

  v_parceiro_id := public.current_parceiro_id();

  return query
    select
      coalesce((
        select count(distinct t.membro_id) from public.transacoes t
        join public.membros m on m.id = t.membro_id
        where t.parceiro_id = v_parceiro_id and m.ativo
      ), 0) as membros_ativos,
      coalesce((
        select sum(t.pontos) from public.transacoes t
        where t.parceiro_id = v_parceiro_id and t.tipo = 'credito'
      ), 0) as pontos_gerados,
      coalesce((
        select count(*) from public.cupons c
        where c.parceiro_id = v_parceiro_id and c.status = 'resgatado'
      ), 0) as cupons_resgatados,
      coalesce((
        select sum(cn.valor_beneficio) from public.cupons c
        join public.cupom_niveis cn on cn.id = c.cupom_nivel_id
        where c.parceiro_id = v_parceiro_id and c.status = 'resgatado' and cn.tipo_beneficio = 'desconto_valor'
      ), 0) as desconto_concedido,
      coalesce((
        select count(*) from public.membros m
        where m.origem_parceiro_id = v_parceiro_id and m.created_at >= date_trunc('month', now())
      ), 0) as novos_clientes_mes;
end;
$$;

grant execute on function public.parceiro_dashboard_stats() to authenticated;

-- ============================================================
-- RPC: clientes que ja compraram neste parceiro
-- ============================================================

create or replace function public.parceiro_clientes()
returns table (
  membro_id uuid,
  nome text,
  telefone text,
  ultimo_acesso timestamptz,
  total_gasto numeric,
  pontos_gerados bigint
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_parceiro_id uuid;
begin
  if not public.is_parceiro() then
    raise exception 'apenas parceiros podem ver esta lista';
  end if;

  v_parceiro_id := public.current_parceiro_id();

  return query
    select
      m.id,
      m.nome,
      m.telefone,
      max(t.created_at) as ultimo_acesso,
      coalesce(sum(t.valor_compra) filter (where t.tipo = 'credito'), 0) as total_gasto,
      coalesce(sum(t.pontos) filter (where t.tipo = 'credito'), 0) as pontos_gerados
    from public.transacoes t
    join public.membros m on m.id = t.membro_id
    where t.parceiro_id = v_parceiro_id
    group by m.id, m.nome, m.telefone
    order by ultimo_acesso desc;
end;
$$;

grant execute on function public.parceiro_clientes() to authenticated;

-- ============================================================
-- RPC: relatorio mensal por parceiro (usado pelo n8n)
-- ============================================================

create or replace function public.parceiro_relatorio_mensal(
  p_parceiro_id uuid,
  p_referencia date default (date_trunc('month', now() - interval '1 month'))::date
)
returns table (
  parceiro_id uuid,
  parceiro_nome text,
  mes_referencia date,
  membros_ativos bigint,
  novos_clientes bigint,
  total_transacoes bigint,
  valor_movimentado numeric,
  pontos_gerados bigint,
  cupons_resgatados bigint,
  desconto_concedido numeric
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_inicio date := date_trunc('month', p_referencia)::date;
  v_fim date := (date_trunc('month', p_referencia) + interval '1 month')::date;
begin
  if not (
    public.is_admin()
    or (public.is_parceiro() and public.current_parceiro_id() = p_parceiro_id)
    or auth.role() = 'service_role'
  ) then
    raise exception 'sem permissao para ver este relatorio';
  end if;

  return query
    select
      p.id,
      p.nome,
      v_inicio,
      coalesce((
        select count(distinct t.membro_id) from public.transacoes t
        join public.membros m on m.id = t.membro_id
        where t.parceiro_id = p.id and m.ativo
          and t.created_at >= v_inicio and t.created_at < v_fim
      ), 0),
      coalesce((
        select count(*) from public.membros m
        where m.origem_parceiro_id = p.id
          and m.created_at >= v_inicio and m.created_at < v_fim
      ), 0),
      coalesce((
        select count(*) from public.transacoes t
        where t.parceiro_id = p.id
          and t.created_at >= v_inicio and t.created_at < v_fim
      ), 0),
      coalesce((
        select sum(t.valor_compra) from public.transacoes t
        where t.parceiro_id = p.id and t.tipo = 'credito'
          and t.created_at >= v_inicio and t.created_at < v_fim
      ), 0),
      coalesce((
        select sum(t.pontos) from public.transacoes t
        where t.parceiro_id = p.id and t.tipo = 'credito'
          and t.created_at >= v_inicio and t.created_at < v_fim
      ), 0),
      coalesce((
        select count(*) from public.cupons c
        where c.parceiro_id = p.id and c.status = 'resgatado'
          and c.data_resgate >= v_inicio and c.data_resgate < v_fim
      ), 0),
      coalesce((
        select sum(cn.valor_beneficio) from public.cupons c
        join public.cupom_niveis cn on cn.id = c.cupom_nivel_id
        where c.parceiro_id = p.id and c.status = 'resgatado' and cn.tipo_beneficio = 'desconto_valor'
          and c.data_resgate >= v_inicio and c.data_resgate < v_fim
      ), 0)
    from public.parceiros p
    where p.id = p_parceiro_id;
end;
$$;

grant execute on function public.parceiro_relatorio_mensal(uuid, date) to authenticated, service_role;
