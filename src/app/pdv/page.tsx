import { createClient } from '@/lib/supabase/server'
import { getPerfilAtual } from '@/lib/auth/perfil'
import { LancarPontosForm } from './lancar-pontos-form'

export default async function PdvPage() {
  const perfil = await getPerfilAtual()
  const supabase = await createClient()

  const { data: parceiro } = await supabase
    .from('parceiros')
    .select('taxa_conversao_pontos')
    .eq('id', perfil!.parceiro_id!)
    .single()

  return (
    <div className="space-y-4">
      <h2 className="text-base font-medium text-slate-900">Registrar pontos</h2>
      <LancarPontosForm taxaConversao={parceiro?.taxa_conversao_pontos ?? 1} />
    </div>
  )
}
