-- ============================================================
-- FIX: pgcrypto no schema "extensions"
-- No Supabase, a extensao pgcrypto e instalada no schema
-- "extensions" (nao em "public"). As funcoes abaixo foram
-- criadas com search_path = public, entao crypt()/gen_salt()
-- nao eram encontradas, gerando o erro:
--   function gen_salt(unknown) does not exist
-- Corrigido incluindo "extensions" no search_path das funcoes.
-- ============================================================

create or replace function public.verificar_pin_atendente(p_atendente_id uuid, p_pin text)
returns table(id uuid, nome text, parceiro_id uuid)
language plpgsql
security definer set search_path = public, extensions
as $$
begin
  return query
    select a.id, a.nome, a.parceiro_id
    from public.atendentes a
    where a.id = p_atendente_id
      and a.ativo = true
      and a.parceiro_id = public.current_parceiro_id()
      and a.pin_hash = crypt(p_pin, a.pin_hash);
end;
$$;

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

create or replace function public.redefinir_pin_atendente(p_atendente_id uuid, p_pin text)
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
begin
  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'o PIN deve ter entre 4 e 6 digitos numericos';
  end if;

  update public.atendentes
    set pin_hash = crypt(p_pin, gen_salt('bf'))
    where id = p_atendente_id
      and parceiro_id = public.current_parceiro_id();
end;
$$;
