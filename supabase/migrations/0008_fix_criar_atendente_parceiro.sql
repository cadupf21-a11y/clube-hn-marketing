-- ============================================================
-- FIX: recria criar_atendente(p_nome text, p_pin text)
-- Esta versao (usada pelo painel do parceiro em
-- /parceiro/atendentes) usa current_parceiro_id() para
-- descobrir o parceiro do usuario logado. Recriada aqui pois
-- a versao anterior deixou de existir no banco.
-- ============================================================

create or replace function public.criar_atendente(p_nome text, p_pin text)
returns public.atendentes
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_atendente public.atendentes;
begin
  if not public.is_parceiro() then
    raise exception 'apenas parceiros podem cadastrar atendentes';
  end if;

  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'o PIN deve ter entre 4 e 6 digitos numericos';
  end if;

  insert into public.atendentes (parceiro_id, nome, pin_hash)
  values (public.current_parceiro_id(), p_nome, crypt(p_pin, gen_salt('bf')))
  returning * into v_atendente;

  return v_atendente;
end;
$$;
