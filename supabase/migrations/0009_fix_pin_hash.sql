-- ============================================================
-- FIX: hash/verificacao do PIN do atendente usando o mesmo
-- schema do pgcrypto.
--
-- As migrations 0006/0008 ja adicionaram "extensions" ao
-- search_path de criar_atendente e verificar_pin_atendente,
-- mas deixavam crypt()/gen_salt() sem qualificacao de schema,
-- dependendo da resolucao via search_path. Para eliminar
-- qualquer ambiguidade (e garantir que o hash gerado no
-- cadastro seja sempre comparavel pela verificacao), as
-- chamadas passam a ser explicitamente extensions.crypt(...)
-- e extensions.gen_salt(...).
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
  values (public.current_parceiro_id(), p_nome, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  returning * into v_atendente;

  return v_atendente;
end;
$$;

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
      and a.pin_hash = extensions.crypt(p_pin, a.pin_hash);
end;
$$;
