-- ============================================================
-- Corrige a regra de visibilidade de parceiro_niveis_disponiveis()
--
-- Regra correta, independente do "dono" do nivel (cupom_niveis.parceiro_id):
--   - nivel SEM nenhum registro em cupom_nivel_parceiros = sem restricao,
--     visivel para todos os parceiros;
--   - nivel COM registro(s) em cupom_nivel_parceiros = visivel apenas
--     para os parceiros listados.
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
    where not exists (
      select 1 from public.cupom_nivel_parceiros cnp where cnp.cupom_nivel_id = cn.id
    )
    or exists (
      select 1 from public.cupom_nivel_parceiros cnp
      where cnp.cupom_nivel_id = cn.id and cnp.parceiro_id = v_parceiro_id
    )
    order by cn.pontos_necessarios;
end;
$$;

grant execute on function public.parceiro_niveis_disponiveis() to authenticated;
