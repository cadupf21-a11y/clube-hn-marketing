import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sairPdv } from '@/app/atendente/actions'
import { PdvNav } from './pdv-nav'

export default async function PdvLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const atendenteId = cookieStore.get('atendente_id')?.value

  if (!atendenteId) {
    redirect('/atendente')
  }

  const supabase = await createClient()
  const { data: atendente } = await supabase
    .from('atendentes')
    .select('nome')
    .eq('id', atendenteId)
    .single()

  return (
    <div className="min-h-screen bg-appbg">
      <header className="flex items-center justify-between bg-gradient-to-r from-primary to-accent px-4 py-3 shadow-md">
        <div>
          <p className="text-xs text-white/70">PDV - Clube HN</p>
          <p className="text-sm font-medium text-white">{atendente?.nome ?? 'Atendente'}</p>
        </div>
        <form action={sairPdv}>
          <button className="rounded-md border border-white/40 px-3 py-1.5 text-sm text-white hover:bg-white/10">
            Trocar atendente
          </button>
        </form>
      </header>
      <PdvNav />
      <main className="mx-auto max-w-md px-4 py-6">{children}</main>
    </div>
  )
}
