import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/types/database.types'

/**
 * Registra uma acao sensivel na audit_log. Falha silenciosamente para
 * nao quebrar o fluxo principal caso a tabela nao exista ou a insercao
 * seja bloqueada por RLS.
 */
export async function registrarAuditoria(
  supabase: SupabaseClient<Database>,
  acao: string,
  entidade: string,
  entidade_id: string | null,
  detalhes?: Json,
) {
  try {
    const { data } = await supabase.auth.getUser()

    await supabase.from('audit_log').insert({
      acao,
      entidade,
      entidade_id,
      executado_por: data.user?.id ?? null,
      detalhes: detalhes ?? null,
    })
  } catch {
    // auditoria nao deve quebrar o fluxo principal
  }
}
