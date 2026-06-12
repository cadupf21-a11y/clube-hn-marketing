-- ============================================================
-- data_nascimento (dia/mes) dos membros
--
-- A coluna "data_nascimento" ja existe (date, opcional) desde a
-- migration 0001. Para nao expor a idade do membro, o bot do
-- WhatsApp armazena apenas dia e mes, sempre com o ano fixo em
-- 2000 (ano bissexto, permite 29/02). Garantimos isso com uma
-- check constraint.
--
-- Tambem criamos a RPC membros_aniversariantes_mes(), usada pelo
-- filtro de segmentacao "Aniversariantes do mes" em
-- /admin/disparos/novo, comparando
-- EXTRACT(MONTH FROM data_nascimento) = EXTRACT(MONTH FROM NOW()).
-- ============================================================

alter table public.membros
  add constraint membros_data_nascimento_ano_fixo
  check (data_nascimento is null or extract(year from data_nascimento) = 2000);

-- Esta funcao e usada apenas pelo backend (service role) na geracao
-- de disparos. Como retorna telefones de todos os membros, o acesso
-- via PostgREST fica restrito ao service_role.
create or replace function public.membros_aniversariantes_mes()
returns table(id uuid, telefone text)
language sql stable
security definer set search_path = public
as $$
  select m.id, m.telefone
  from public.membros m
  where m.ativo = true
    and m.data_nascimento is not null
    and extract(month from m.data_nascimento) = extract(month from now());
$$;

revoke execute on function public.membros_aniversariantes_mes() from public, anon, authenticated;
grant execute on function public.membros_aniversariantes_mes() to service_role;
