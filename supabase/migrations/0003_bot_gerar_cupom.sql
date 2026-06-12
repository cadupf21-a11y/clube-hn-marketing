-- ============================================================
-- BOT WHATSAPP: geracao de cupom via resgate de pontos (autoatendimento)
-- ============================================================

create or replace function public.gerar_cupom_membro(
  p_membro_id uuid,
  p_cupom_nivel_id uuid
)
returns table (
  codigo text,
  nivel_nome text,
  pontos_utilizados integer,
  data_validade timestamptz,
  saldo_atual integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membro public.membros%rowtype;
  v_nivel public.cupom_niveis%rowtype;
  v_parceiro_id uuid;
  v_codigo text;
  v_validade timestamptz;
  v_cupom_id uuid;
begin
  select * into v_membro from public.membros where id = p_membro_id for update;
  if not found then
    raise exception 'Membro nao encontrado';
  end if;

  select * into v_nivel from public.cupom_niveis where id = p_cupom_nivel_id and ativo = true;
  if not found then
    raise exception 'Nivel de cupom nao encontrado ou inativo';
  end if;

  if v_nivel.parceiro_id is not null and v_nivel.parceiro_id <> v_membro.origem_parceiro_id then
    raise exception 'Cupom nao disponivel para este membro';
  end if;

  if v_membro.pontos_saldo < v_nivel.pontos_necessarios then
    raise exception 'Saldo insuficiente para este cupom';
  end if;

  v_parceiro_id := coalesce(v_nivel.parceiro_id, v_membro.origem_parceiro_id);
  if v_parceiro_id is null then
    raise exception 'Nao foi possivel determinar o parceiro do cupom';
  end if;

  v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_validade := now() + (v_nivel.validade_dias || ' days')::interval;

  insert into public.cupons (membro_id, cupom_nivel_id, parceiro_id, codigo, status, pontos_utilizados, data_validade)
  values (p_membro_id, p_cupom_nivel_id, v_parceiro_id, v_codigo, 'disponivel', v_nivel.pontos_necessarios, v_validade)
  returning id into v_cupom_id;

  -- trigger trg_transacoes_aplicar_pontos subtrai 'pontos' do saldo para tipo 'debito'
  insert into public.transacoes (membro_id, parceiro_id, tipo, pontos, descricao, cupom_id)
  values (p_membro_id, v_parceiro_id, 'debito', v_nivel.pontos_necessarios, 'Resgate de cupom via WhatsApp: ' || v_nivel.nome, v_cupom_id);

  return query
    select v_codigo, v_nivel.nome, v_nivel.pontos_necessarios, v_validade,
           (select pontos_saldo from public.membros where id = p_membro_id);
end;
$$;

grant execute on function public.gerar_cupom_membro(uuid, uuid) to service_role;
