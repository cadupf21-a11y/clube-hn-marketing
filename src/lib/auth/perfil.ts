import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'

export type Perfil = Database['public']['Tables']['perfis']['Row']

/**
 * Retorna o usuario autenticado e seu perfil (admin HN ou dono parceiro).
 * Retorna null se nao houver sessao ou perfil correspondente.
 */
export async function getPerfilAtual(): Promise<Perfil | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: perfil } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', user.id)
    .single()

  return perfil ?? null
}
