-- ============================================================
-- RPC: niveis de cupom disponiveis para o parceiro logado
--
-- Um nivel fica visivel para o parceiro quando:
--   - foi criado especificamente para ele (cupom_niveis.parceiro_id = parceiro), ou
--   - e global (cupom_niveis.parceiro_id is null) e:
--       - nao tem nenhuma restricao em cupom_nivel_parceiros (aceito por todos), ou
--       - tem uma restricao que inclui este parceiro.
--
-- A policy "parceiro ve seus vinculos de niveis" so permite ao parceiro
-- enxergar os proprios vinculos em cupom_nivel_parceiros, entao nao e
-- possivel checar "sem nenhuma restricao" via select direto. Esta funcao
-- (security definer) resolve isso com acesso completo as duas tabelas.
-- ============================================================

create or replace function public.parceiro_niveis_disponiveis()
returns setof public.cupom_niveis
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
    select cn.*
    from public.cupom_niveis cn
    where cn.parceiro_id = v_parceiro_id
       or (
         cn.parceiro_id is null
         and (
           not exists (
             select 1 from public.cupom_nivel_parceiros cnp where cnp.cupom_nivel_id = cn.id
           )
           or exists (
             select 1 from public.cupom_nivel_parceiros cnp
             where cnp.cupom_nivel_id = cn.id and cnp.parceiro_id = v_parceiro_id
           )
         )
       )
    order by cn.pontos_necessarios;
end;
$$;

grant execute on function public.parceiro_niveis_disponiveis() to authenticated;
