import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DisparoForm } from '../disparo-form'
import { criarDisparo } from '../actions'

export default async function NovoDisparoPage() {
  const supabase = await createClient()
  const { data: parceiros } = await supabase.from('parceiros').select('id, nome').eq('ativo', true).order('nome')

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/disparos" className="text-sm text-slate-500 hover:underline">
          &larr; Disparos
        </Link>
        <h2 className="text-base font-medium text-slate-900">Nova campanha</h2>
      </div>
      <DisparoForm parceiros={parceiros ?? []} action={criarDisparo} />
    </div>
  )
}
