-- ============================================================
-- ATENDENTES: gestao pelo painel admin
-- Permite que um admin crie atendentes e redefina PINs para
-- qualquer parceiro, informando o parceiro_id explicitamente
-- (o admin nao possui current_parceiro_id()).
-- ============================================================

create or replace function public.criar_atendente(p_parceiro_id uuid, p_nome text, p_pin text)
returns public.atendentes
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_atendente public.atendentes;
begin
  if not public.is_admin() then
    raise exception 'apenas administradores podem cadastrar atendentes para outros parceiros';
  end if;

  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'o PIN deve ter entre 4 e 6 digitos numericos';
  end if;

  insert into public.atendentes (parceiro_id, nome, pin_hash)
  values (p_parceiro_id, p_nome, crypt(p_pin, gen_salt('bf')))
  returning * into v_atendente;

  return v_atendente;
end;
$$;

create or replace function public.redefinir_pin_atendente(p_parceiro_id uuid, p_atendente_id uuid, p_pin text)
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'apenas administradores podem redefinir o PIN de atendentes de outros parceiros';
  end if;

  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'o PIN deve ter entre 4 e 6 digitos numericos';
  end if;

  update public.atendentes
    set pin_hash = crypt(p_pin, gen_salt('bf'))
    where id = p_atendente_id
      and parceiro_id = p_parceiro_id;
end;
$$;
