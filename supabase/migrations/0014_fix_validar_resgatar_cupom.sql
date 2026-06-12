-- ============================================================
-- Corrige a busca/resgate de cupom no PDV.
--
-- Antes, a busca e o resgate exigiam cupons.parceiro_id = parceiro
-- logado, mas esse campo guarda o parceiro "dono" do nivel no
-- momento da emissao do cupom (ou null para niveis globais), o que
-- bloqueava a validacao em outros parceiros que tambem aceitam
-- aquele nivel via cupom_nivel_parceiros.
--
-- Regra correta (mesma de parceiro_niveis_disponiveis):
--   - nivel SEM registro em cupom_nivel_parceiros = sem restricao,
--     qualquer parceiro pode buscar/resgatar;
--   - nivel COM registro(s) em cupom_nivel_parceiros = apenas os
--     parceiros listados podem buscar/resgatar.
--
-- RPC nova: parceiro_buscar_cupom(p_codigo) - busca por codigo
-- respeitando essa regra, contornando a RLS restritiva de cupons.
--
-- resgatar_cupom: passa a usar a mesma regra de disponibilidade
-- (em vez de cupons.parceiro_id = parceiro logado) e atualiza
-- cupons.parceiro_id para o parceiro que efetivamente resgatou,
-- para que o cupom apareca em /parceiro/cupons-resgatados de quem
-- o validou.
-- ============================================================

create or replace function public.parceiro_buscar_cupom(p_codigo text)
returns table (
  id uuid,
  codigo text,
  status text,
  data_validade timestamptz,
  pontos_utilizados integer,
  membro_nome text,
  nivel_nome text,
  nivel_descricao text,
  tipo_beneficio text,
  valor_beneficio numeric
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_parceiro_id uuid;
begin
  if not public.is_parceiro() then
    raise exception 'apenas parceiros podem buscar cupons';
  end if;

  v_parceiro_id := public.current_parceiro_id();

  return query
    select c.id, c.codigo, c.status, c.data_validade, c.pontos_utilizados,
           m.nome, cn.nome, cn.descricao, cn.tipo_beneficio, cn.valor_beneficio
    from public.cupons c
    join public.membros m on m.id = c.membro_id
    join public.cupom_niveis cn on cn.id = c.cupom_nivel_id
    where c.codigo = p_codigo
      and (
        not exists (select 1 from public.cupom_nivel_parceiros cnp where cnp.cupom_nivel_id = cn.id)
        or exists (
          select 1 from public.cupom_nivel_parceiros cnp
          where cnp.cupom_nivel_id = cn.id and cnp.parceiro_id = v_parceiro_id
        )
      );
end;
$$;

grant execute on function public.parceiro_buscar_cupom(text) to authenticated;

create or replace function public.resgatar_cupom(p_cupom_id uuid, p_atendente_id uuid)
returns table(membro_nome text, pontos_utilizados integer, saldo_atual integer, nivel_nome text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_cupom public.cupons;
  v_saldo integer;
  v_parceiro_id uuid;
begin
  if not public.is_parceiro() then
    raise exception 'apenas parceiros podem resgatar cupons';
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

  update public.cupons
    set status = 'resgatado', data_resgate = now(), resgatado_por = p_atendente_id, parceiro_id = v_parceiro_id
    where id = v_cupom.id;

  insert into public.transacoes (membro_id, parceiro_id, atendente_id, tipo, pontos, descricao, cupom_id)
  values (v_cupom.membro_id, v_parceiro_id, p_atendente_id, 'resgate', v_cupom.pontos_utilizados, 'Resgate de cupom', v_cupom.id);

  return query
    select m.nome, v_cupom.pontos_utilizados, m.pontos_saldo, cn.nome
    from public.membros m
    join public.cupom_niveis cn on cn.id = v_cupom.cupom_nivel_id
    where m.id = v_cupom.membro_id;
end;
$$;

grant execute on function public.resgatar_cupom(uuid, uuid) to authenticated;
