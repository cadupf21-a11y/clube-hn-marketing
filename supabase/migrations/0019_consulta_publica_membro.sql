-- ============================================================
-- RPC publica (anon) para a pagina /consulta, onde o membro
-- informa o telefone e ve seu saldo de pontos, nivel e cupons
-- disponiveis sem precisar fazer login.
--
-- E security definer (roda com privilegios do owner, ignorando RLS)
-- pois a tabela "membros" nao tem policy de SELECT para anon. Para
-- nao expor dados sensiveis, a funcao retorna apenas nome, saldo de
-- pontos, nivel e os cupons com status 'disponivel' (codigo, nivel e
-- validade) — nunca CPF, email ou telefone de outros membros.
-- ============================================================

create or replace function public.consulta_publica_membro(p_telefone text)
returns table (
  nome text,
  pontos_saldo integer,
  nivel text,
  cupons jsonb
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_telefone text := regexp_replace(p_telefone, '\D', '', 'g');
begin
  return query
    select
      m.nome,
      m.pontos_saldo,
      m.nivel,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'codigo', c.codigo,
              'nivel_nome', cn.nome,
              'data_validade', c.data_validade
            )
            order by c.data_validade
          )
          from public.cupons c
          join public.cupom_niveis cn on cn.id = c.cupom_nivel_id
          where c.membro_id = m.id and c.status = 'disponivel'
        ),
        '[]'::jsonb
      ) as cupons
    from public.membros m
    where m.telefone = v_telefone
    limit 1;
end;
$$;

revoke execute on function public.consulta_publica_membro(text) from public;
grant execute on function public.consulta_publica_membro(text) to anon, authenticated;
