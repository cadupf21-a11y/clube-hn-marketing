-- Clube HN Marketing - schema inicial
-- Tabelas: parceiros, perfis, atendentes, membros, cupom_niveis, cupons, transacoes, disparos

create extension if not exists "pgcrypto";

-- ============================================================
-- FUNCOES UTILITARIAS (definidas antes para uso em triggers)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- PARCEIROS (estabelecimentos parceiros do clube)
-- ============================================================

create table public.parceiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  razao_social text,
  cnpj text unique,
  categoria text,
  telefone text,
  email text,
  endereco text,
  cidade text,
  estado text,
  logo_url text,
  cor_destaque text,
  taxa_conversao_pontos numeric(10,2) not null default 1, -- pontos gerados por R$1 gasto
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_parceiros_updated_at
  before update on public.parceiros
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- PERFIS (admin HN e dono parceiro - vinculados a auth.users)
-- ============================================================

create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  role text not null check (role in ('admin', 'parceiro')),
  parceiro_id uuid references public.parceiros(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint perfis_parceiro_role_check check (
    (role = 'parceiro' and parceiro_id is not null) or
    (role = 'admin' and parceiro_id is null)
  )
);

create index idx_perfis_parceiro_id on public.perfis(parceiro_id);

-- cria automaticamente um perfil quando um usuario e criado no Supabase Auth
-- espera metadata: { nome, role, parceiro_id }
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfis (id, nome, email, role, parceiro_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'parceiro'),
    nullif(new.raw_user_meta_data->>'parceiro_id', '')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ATENDENTES (perfil PIN, vinculados a um parceiro)
-- ============================================================

create table public.atendentes (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid not null references public.parceiros(id) on delete cascade,
  nome text not null,
  pin_hash text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_atendentes_parceiro_id on public.atendentes(parceiro_id);

-- ============================================================
-- MEMBROS (clientes do clube de fidelidade)
-- ============================================================

create table public.membros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text unique,
  email text,
  telefone text not null,
  data_nascimento date,
  pontos_saldo integer not null default 0,
  pontos_acumulados_total integer not null default 0,
  nivel text not null default 'bronze',
  ativo boolean not null default true,
  origem_parceiro_id uuid references public.parceiros(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_membros_telefone on public.membros(telefone);
create index idx_membros_cpf on public.membros(cpf);

create trigger trg_membros_updated_at
  before update on public.membros
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- CUPOM_NIVEIS (niveis/recompensas resgataveis por pontos)
-- ============================================================

create table public.cupom_niveis (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid references public.parceiros(id) on delete cascade, -- null = recompensa global do clube HN
  nome text not null,
  descricao text,
  pontos_necessarios integer not null check (pontos_necessarios > 0),
  tipo_beneficio text not null check (tipo_beneficio in ('desconto_percentual', 'desconto_valor', 'produto_gratis', 'outro')),
  valor_beneficio numeric(10,2),
  validade_dias integer not null default 30 check (validade_dias > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_cupom_niveis_parceiro_id on public.cupom_niveis(parceiro_id);

-- ============================================================
-- CUPONS (cupons emitidos para membros a partir de um cupom_nivel)
-- ============================================================

create table public.cupons (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.membros(id) on delete cascade,
  cupom_nivel_id uuid not null references public.cupom_niveis(id),
  parceiro_id uuid references public.parceiros(id) on delete set null,
  codigo text not null unique,
  status text not null default 'disponivel' check (status in ('disponivel', 'resgatado', 'expirado', 'cancelado')),
  pontos_utilizados integer not null check (pontos_utilizados > 0),
  data_emissao timestamptz not null default now(),
  data_validade timestamptz not null,
  data_resgate timestamptz,
  resgatado_por uuid references public.atendentes(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_cupons_membro_id on public.cupons(membro_id);
create index idx_cupons_parceiro_id on public.cupons(parceiro_id);
create index idx_cupons_codigo on public.cupons(codigo);

-- ============================================================
-- TRANSACOES (lancamentos de pontos: credito, debito, ajuste, resgate)
-- ============================================================

create table public.transacoes (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references public.membros(id) on delete cascade,
  parceiro_id uuid not null references public.parceiros(id),
  atendente_id uuid references public.atendentes(id) on delete set null,
  tipo text not null check (tipo in ('credito', 'debito', 'ajuste', 'resgate')),
  valor_compra numeric(10,2),
  pontos integer not null,
  descricao text,
  cupom_id uuid references public.cupons(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_transacoes_membro_id on public.transacoes(membro_id);
create index idx_transacoes_parceiro_id on public.transacoes(parceiro_id);
create index idx_transacoes_created_at on public.transacoes(created_at);

-- atualiza saldo de pontos do membro a cada transacao
create or replace function public.aplicar_transacao_pontos()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.tipo in ('credito', 'ajuste') then
    update public.membros
      set pontos_saldo = pontos_saldo + new.pontos,
          pontos_acumulados_total = case when new.pontos > 0
            then pontos_acumulados_total + new.pontos
            else pontos_acumulados_total
          end
      where id = new.membro_id;
  elsif new.tipo in ('debito', 'resgate') then
    update public.membros
      set pontos_saldo = pontos_saldo - new.pontos
      where id = new.membro_id;
  end if;
  return new;
end;
$$;

create trigger trg_transacoes_aplicar_pontos
  after insert on public.transacoes
  for each row execute procedure public.aplicar_transacao_pontos();

-- ============================================================
-- DISPAROS (campanhas de marketing / mensagens)
-- ============================================================

create table public.disparos (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid references public.parceiros(id) on delete cascade, -- null = campanha do clube HN
  titulo text not null,
  canal text not null check (canal in ('whatsapp', 'email', 'sms', 'push')),
  segmento jsonb not null default '{}'::jsonb, -- criterios de publico-alvo
  mensagem text not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'agendado', 'enviando', 'enviado', 'cancelado')),
  agendado_para timestamptz,
  enviado_em timestamptz,
  total_destinatarios integer not null default 0,
  total_enviados integer not null default 0,
  criado_por uuid references public.perfis(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_disparos_parceiro_id on public.disparos(parceiro_id);

-- ============================================================
-- FUNCOES AUXILIARES DE AUTENTICACAO / RLS
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and role = 'admin' and ativo
  );
$$;

create or replace function public.is_parceiro()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and role = 'parceiro' and ativo
  );
$$;

create or replace function public.current_parceiro_id()
returns uuid
language sql stable
security definer set search_path = public
as $$
  select parceiro_id from public.perfis where id = auth.uid();
$$;

-- valida o PIN de um atendente dentro do parceiro do usuario logado
create or replace function public.verificar_pin_atendente(p_atendente_id uuid, p_pin text)
returns table(id uuid, nome text, parceiro_id uuid)
language plpgsql
security definer set search_path = public
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

-- cria um atendente para o parceiro logado, com o PIN ja hasheado
create or replace function public.criar_atendente(p_nome text, p_pin text)
returns public.atendentes
language plpgsql
security definer set search_path = public
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

-- redefine o PIN de um atendente do parceiro logado
create or replace function public.redefinir_pin_atendente(p_atendente_id uuid, p_pin text)
returns void
language plpgsql
security definer set search_path = public
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

-- ============================================================
-- RLS
-- ============================================================

alter table public.parceiros enable row level security;
alter table public.perfis enable row level security;
alter table public.atendentes enable row level security;
alter table public.membros enable row level security;
alter table public.cupom_niveis enable row level security;
alter table public.cupons enable row level security;
alter table public.transacoes enable row level security;
alter table public.disparos enable row level security;

-- PARCEIROS
create policy "admin gerencia parceiros" on public.parceiros
  for all using (public.is_admin()) with check (public.is_admin());

create policy "parceiro ve e edita o proprio cadastro" on public.parceiros
  for select using (id = public.current_parceiro_id());

create policy "parceiro atualiza o proprio cadastro" on public.parceiros
  for update using (id = public.current_parceiro_id())
  with check (id = public.current_parceiro_id());

-- PERFIS
create policy "admin gerencia perfis" on public.perfis
  for all using (public.is_admin()) with check (public.is_admin());

create policy "usuario ve o proprio perfil" on public.perfis
  for select using (id = auth.uid());

create policy "usuario atualiza o proprio perfil" on public.perfis
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ATENDENTES
create policy "admin gerencia atendentes" on public.atendentes
  for all using (public.is_admin()) with check (public.is_admin());

create policy "parceiro gerencia seus atendentes" on public.atendentes
  for all using (parceiro_id = public.current_parceiro_id())
  with check (parceiro_id = public.current_parceiro_id());

-- MEMBROS (cadastro compartilhado do clube)
create policy "admin gerencia membros" on public.membros
  for all using (public.is_admin()) with check (public.is_admin());

create policy "parceiro consulta membros" on public.membros
  for select using (public.is_parceiro());

create policy "parceiro cadastra membros" on public.membros
  for insert with check (public.is_parceiro());

-- CUPOM_NIVEIS
create policy "admin gerencia cupom_niveis" on public.cupom_niveis
  for all using (public.is_admin()) with check (public.is_admin());

create policy "parceiro ve niveis globais e proprios" on public.cupom_niveis
  for select using (parceiro_id is null or parceiro_id = public.current_parceiro_id());

create policy "parceiro gerencia seus cupom_niveis" on public.cupom_niveis
  for insert with check (parceiro_id = public.current_parceiro_id());

create policy "parceiro atualiza seus cupom_niveis" on public.cupom_niveis
  for update using (parceiro_id = public.current_parceiro_id())
  with check (parceiro_id = public.current_parceiro_id());

create policy "parceiro remove seus cupom_niveis" on public.cupom_niveis
  for delete using (parceiro_id = public.current_parceiro_id());

-- CUPONS
create policy "admin gerencia cupons" on public.cupons
  for all using (public.is_admin()) with check (public.is_admin());

create policy "parceiro ve cupons proprios" on public.cupons
  for select using (parceiro_id = public.current_parceiro_id());

create policy "parceiro emite cupons" on public.cupons
  for insert with check (parceiro_id = public.current_parceiro_id());

create policy "parceiro atualiza cupons proprios" on public.cupons
  for update using (parceiro_id = public.current_parceiro_id())
  with check (parceiro_id = public.current_parceiro_id());

-- TRANSACOES (ledger imutavel: sem update/delete via API)
create policy "admin ve todas transacoes" on public.transacoes
  for select using (public.is_admin());

create policy "parceiro ve suas transacoes" on public.transacoes
  for select using (parceiro_id = public.current_parceiro_id());

create policy "parceiro lanca transacoes" on public.transacoes
  for insert with check (parceiro_id = public.current_parceiro_id());

-- DISPAROS
create policy "admin gerencia disparos" on public.disparos
  for all using (public.is_admin()) with check (public.is_admin());

create policy "parceiro ve disparos globais e proprios" on public.disparos
  for select using (parceiro_id is null or parceiro_id = public.current_parceiro_id());

create policy "parceiro gerencia seus disparos" on public.disparos
  for insert with check (parceiro_id = public.current_parceiro_id());

create policy "parceiro atualiza seus disparos" on public.disparos
  for update using (parceiro_id = public.current_parceiro_id())
  with check (parceiro_id = public.current_parceiro_id());

create policy "parceiro remove seus disparos" on public.disparos
  for delete using (parceiro_id = public.current_parceiro_id());
