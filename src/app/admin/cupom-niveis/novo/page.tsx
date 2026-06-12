import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NivelForm } from '../nivel-form'

export default async function NovoNivelPage() {
  const supabase = await createClient()
  const { data: parceiros } = await supabase.from('parceiros').select('id, nome').eq('ativo', true).order('nome')

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/cupom-niveis" className="text-sm text-slate-500 hover:underline">
          &larr; Configuracoes
        </Link>
        <h2 className="text-base font-medium text-slate-900">Novo nivel de cupom</h2>
      </div>
      <NivelForm parceiros={parceiros ?? []} parceiroIdsSelecionados={[]} />
    </div>
  )
}
