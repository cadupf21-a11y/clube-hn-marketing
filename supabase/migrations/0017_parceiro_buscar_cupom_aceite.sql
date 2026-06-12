-- ============================================================
-- parceiro_buscar_cupom passa a retornar o cupom mesmo quando o
-- nivel nao e aceito pelo parceiro logado, junto com:
--   - aceito_neste_parceiro: indica se o parceiro logado pode
--     resgatar este cupom (mesma regra de cupom_nivel_parceiros)
--   - estabelecimentos_aceitos: nomes dos parceiros que aceitam
--     este nivel de cupom (null = sem restricao, vale em todos)
--
-- Isso permite que o PDV mostre "Este cupom nao e valido neste
-- estabelecimento." em vez de "Cupom nao encontrado" quando o
-- cupom existe mas pertence a um nivel restrito a outros parceiros,
-- e exiba a lista de estabelecimentos que aceitam o cupom.
-- ============================================================

drop function if exists public.parceiro_buscar_cupom(text);

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
  valor_beneficio numeric,
  aceito_neste_parceiro boolean,
  estabelecimentos_aceitos text[]
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
    select
      c.id, c.codigo, c.status, c.data_validade, c.pontos_utilizados,
      m.nome, cn.nome, cn.descricao, cn.tipo_beneficio, cn.valor_beneficio,
      (
        not exists (select 1 from public.cupom_nivel_parceiros cnp where cnp.cupom_nivel_id = cn.id)
        or exists (
          select 1 from public.cupom_nivel_parceiros cnp
          where cnp.cupom_nivel_id = cn.id and cnp.parceiro_id = v_parceiro_id
        )
      ) as aceito_neste_parceiro,
      (
        select array_agg(p.nome order by p.nome)
        from public.cupom_nivel_parceiros cnp
        join public.parceiros p on p.id = cnp.parceiro_id
        where cnp.cupom_nivel_id = cn.id
      ) as estabelecimentos_aceitos
    from public.cupons c
    join public.membros m on m.id = c.membro_id
    join public.cupom_niveis cn on cn.id = c.cupom_nivel_id
    where c.codigo = p_codigo;
end;
$$;

grant execute on function public.parceiro_buscar_cupom(text) to authenticated;
