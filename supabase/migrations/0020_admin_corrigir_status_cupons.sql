-- RPC: corrige o status dos cupons com base na data_validade atual.
--
-- O status de um cupom e gravado uma unica vez (em 'expirado') pelas RPCs
-- de validacao/resgate, quando data_validade < now() naquele momento. Se a
-- data_validade for editada/estendida depois, o status pode ficar
-- desatualizado (cupom com validade futura mas status 'expirado'), e
-- vice-versa. Esta funcao reconcilia os dois casos:
--   - status = 'expirado' e data_validade >= now() -> volta para 'disponivel'
--   - status = 'disponivel' e data_validade < now() -> passa para 'expirado'
-- Cupons 'resgatado' e 'cancelado' nunca sao alterados.

create or replace function public.admin_corrigir_status_cupons()
returns table(reativados integer, expirados integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_reativados integer;
  v_expirados integer;
begin
  if not public.is_admin() then
    raise exception 'apenas administradores podem corrigir o status dos cupons';
  end if;

  with atualizados as (
    update public.cupons
    set status = 'disponivel'
    where status = 'expirado' and data_validade >= now()
    returning 1
  )
  select count(*) into v_reativados from atualizados;

  with atualizados as (
    update public.cupons
    set status = 'expirado'
    where status = 'disponivel' and data_validade < now()
    returning 1
  )
  select count(*) into v_expirados from atualizados;

  return query select v_reativados, v_expirados;
end;
$$;

grant execute on function public.admin_corrigir_status_cupons() to authenticated;
