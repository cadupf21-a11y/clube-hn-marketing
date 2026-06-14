-- ============================================================
-- RPCs para os segmentos "Inativos" e "Nunca resgataram" usados em
-- /admin/disparos/novo. Substituem o filtro feito em memoria (que
-- carregava todas as transacoes/cupons) por filtros no banco.
-- Assim como membros_aniversariantes_mes, sao restritas ao
-- service_role pois retornam telefones de membros.
-- ============================================================

create or replace function public.membros_inativos(p_dias_inativos integer)
returns table(id uuid, telefone text)
language sql stable
security definer set search_path = public
as $$
  select m.id, m.telefone
  from public.membros m
  where m.ativo = true
    and not exists (
      select 1
      from public.transacoes t
      where t.membro_id = m.id
        and t.created_at > now() - (p_dias_inativos || ' days')::interval
    );
$$;

revoke execute on function public.membros_inativos(integer) from public, anon, authenticated;
grant execute on function public.membros_inativos(integer) to service_role;

create or replace function public.membros_nunca_resgataram()
returns table(id uuid, telefone text)
language sql stable
security definer set search_path = public
as $$
  select m.id, m.telefone
  from public.membros m
  where m.ativo = true
    and not exists (
      select 1
      from public.cupons c
      where c.membro_id = m.id
        and c.status = 'resgatado'
    );
$$;

revoke execute on function public.membros_nunca_resgataram() from public, anon, authenticated;
grant execute on function public.membros_nunca_resgataram() to service_role;
