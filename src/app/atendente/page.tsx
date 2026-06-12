import { createClient } from '@/lib/supabase/server'
import { getPerfilAtual } from '@/lib/auth/perfil'
import { PinPad } from './pin-pad'

export default async function AtendentePage() {
  const perfil = await getPerfilAtual()
  const supabase = await createClient()

  const { data: atendentes } = await supabase
    .from('atendentes')
    .select('id, nome')
    .eq('parceiro_id', perfil!.parceiro_id!)
    .eq('ativo', true)
    .order('nome')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Identificacao do atendente</h1>
        <p className="text-sm text-slate-500">Selecione seu nome e digite seu PIN para abrir o PDV.</p>
      </div>
      <PinPad atendentes={atendentes ?? []} />
    </main>
  )
}
