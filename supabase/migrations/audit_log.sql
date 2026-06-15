-- Log de auditoria de acoes sensiveis do sistema

create table if not exists audit_log (
  id uuid default gen_random_uuid() primary key,
  acao text not null,
  entidade text not null,
  entidade_id text,
  executado_por text,
  detalhes jsonb,
  created_at timestamptz default now()
);

alter table audit_log enable row level security;

create policy "Admins podem ler audit_log"
  on audit_log for select
  using (is_admin());

create policy "Admins podem inserir audit_log"
  on audit_log for insert
  with check (is_admin());
