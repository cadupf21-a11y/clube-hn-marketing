-- ============================================================
-- Adiciona campos de apresentacao do parceiro:
--   - descricao: frase curta de apresentacao do estabelecimento
--   - google_maps_url: link do Google Maps do estabelecimento
-- ============================================================

alter table public.parceiros add column if not exists descricao text;
alter table public.parceiros add column if not exists google_maps_url text;
