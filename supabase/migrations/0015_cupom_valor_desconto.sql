-- ============================================================
-- Adiciona registro do valor de desconto concedido em cada cupom
-- resgatado, calculado a partir do valor da compra informado pelo
-- atendente no PDV.
--
--   - desconto_percentual: valor_compra * valor_beneficio / 100
--   - desconto_valor: valor_beneficio (valor fixo)
--   - produto_gratis / outro: 0 (sem desconto monetario)
--
-- O dashboard do parceiro (parceiro_dashboard_stats) passa a somar
-- cupons.valor_desconto dos cupons resgatados, em vez de inferir o
-- desconto apenas a partir do nivel.
-- ============================================================

alter table public.cupons add column if not exists valor_desconto numeric(10,2);

drop function if exists public.resgatar_cupom(uuid, uuid);

create or replace function public.resgatar_cupom(p_cupom_id uuid, p_atendente_id uuid, p_valor_compra numeric)
returns table(membro_nome text, pontos_utilizados integer, saldo_atual integer, nivel_nome text, valor_desconto numeric)
language plpgsql
security definer set search_path = public
as $$
declare
  v_cupom public.cupons;
  v_nivel public.cupom_niveis;
  v_saldo integer;
  v_parceiro_id uuid;
  v_valor_desconto numeric(10,2);
begin
  if not public.is_parceiro() then
    raise exception 'apenas parceiros podem resgatar cupons';
  end if;

  if p_valor_compra is null or p_valor_compra < 0 then
    raise exception 'informe o valor da compra';
  end if;

  v_parceiro_id := public.current_parceiro_id();

  if not exists (
    select 1 from public.atendentes
    where id = p_atendente_id and parceiro_id = v_parceiro_id
  ) then
    raise exception 'atendente invalido';
  end if;

  select c.* into v_cupom
  from public.cupons c
  join public.cupom_niveis cn on cn.id = c.cupom_nivel_id
  where c.id = p_cupom_id
    and (
      not exists (select 1 from public.cupom_nivel_parceiros cnp where cnp.cupom_nivel_id = cn.id)
      or exists (
        select 1 from public.cupom_nivel_parceiros cnp
        where cnp.cupom_nivel_id = cn.id and cnp.parceiro_id = v_parceiro_id
      )
    )
  for update of c;

  if not found then
    raise exception 'cupom nao encontrado';
  end if;

  if v_cupom.data_validade < now() and v_cupom.status = 'disponivel' then
    update public.cupons set status = 'expirado' where id = v_cupom.id;
    v_cupom.status := 'expirado';
  end if;

  if v_cupom.status <> 'disponivel' then
    raise exception 'cupom indisponivel (status: %)', v_cupom.status;
  end if;

  select pontos_saldo into v_saldo
  from public.membros
  where id = v_cupom.membro_id
  for update;

  if v_saldo < v_cupom.pontos_utilizados then
    raise exception 'saldo de pontos insuficiente para resgatar este cupom';
  end if;

  select * into v_nivel from public.cupom_niveis where id = v_cupom.cupom_nivel_id;

  v_valor_desconto := case v_nivel.tipo_beneficio
    when 'desconto_percentual' then round(p_valor_compra * v_nivel.valor_beneficio / 100, 2)
    when 'desconto_valor' then v_nivel.valor_beneficio
    else 0
  end;

  update public.cupons
    set status = 'resgatado', data_resgate = now(), resgatado_por = p_atendente_id,
        parceiro_id = v_parceiro_id, valor_desconto = v_valor_desconto
    where id = v_cupom.id;

  insert into public.transacoes (membro_id, parceiro_id, atendente_id, tipo, pontos, descricao, cupom_id)
  values (v_cupom.membro_id, v_parceiro_id, p_atendente_id, 'resgate', v_cupom.pontos_utilizados, 'Resgate de cupom', v_cupom.id);

  return query
    select m.nome, v_cupom.pontos_utilizados, m.pontos_saldo, v_nivel.nome, v_valor_desconto
    from public.membros m
    where m.id = v_cupom.membro_id;
end;
$$;

grant execute on function public.resgatar_cupom(uuid, uuid, numeric) to authenticated;

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
        select sum(c.valor_desconto) from public.cupons c
        where c.parceiro_id = v_parceiro_id and c.status = 'resgatado'
      ), 0) as desconto_concedido,
      coalesce((
        select count(*) from public.membros m
        where m.origem_parceiro_id = v_parceiro_id
          and m.created_at >= date_trunc('month', now())
      ), 0) as novos_clientes_mes;
end;
$$;

grant execute on function public.parceiro_dashboard_stats() to authenticated;
