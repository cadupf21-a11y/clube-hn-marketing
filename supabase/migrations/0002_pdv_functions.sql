-- Clube HN Marketing - funcoes do PDV (Fase 2)

-- resgata um cupom do parceiro logado de forma atomica:
-- valida status/validade, marca o cupom como resgatado, debita os pontos
-- do membro (via transacao tipo 'resgate') e retorna os dados para a tela
-- de confirmacao do PDV.
create or replace function public.resgatar_cupom(p_cupom_id uuid, p_atendente_id uuid)
returns table(membro_nome text, pontos_utilizados integer, saldo_atual integer, nivel_nome text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_cupom public.cupons;
begin
  if not public.is_parceiro() then
    raise exception 'apenas parceiros podem resgatar cupons';
  end if;

  if not exists (
    select 1 from public.atendentes
    where id = p_atendente_id and parceiro_id = public.current_parceiro_id()
  ) then
    raise exception 'atendente invalido';
  end if;

  select * into v_cupom
  from public.cupons
  where id = p_cupom_id
    and parceiro_id = public.current_parceiro_id()
  for update;

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

  update public.cupons
    set status = 'resgatado', data_resgate = now(), resgatado_por = p_atendente_id
    where id = v_cupom.id;

  insert into public.transacoes (membro_id, parceiro_id, atendente_id, tipo, pontos, descricao, cupom_id)
  values (v_cupom.membro_id, v_cupom.parceiro_id, p_atendente_id, 'resgate', v_cupom.pontos_utilizados, 'Resgate de cupom', v_cupom.id);

  return query
    select m.nome, v_cupom.pontos_utilizados, m.pontos_saldo, cn.nome
    from public.membros m
    join public.cupom_niveis cn on cn.id = v_cupom.cupom_nivel_id
    where m.id = v_cupom.membro_id;
end;
$$;
