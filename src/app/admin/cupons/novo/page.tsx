import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EmitirCupomForm } from './emitir-cupom-form'

export default async function NovoCupomPage() {
  const supabase = await createClient()

  const [{ data: niveis }, { data: parceiros }] = await Promise.all([
    supabase
      .from('cupom_niveis')
      .select('id, nome, pontos_necessarios')
      .eq('ativo', true)
      .order('pontos_necessarios'),
    supabase.from('parceiros').select('id, nome').eq('ativo', true).order('nome'),
  ])

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/cupons" className="text-sm text-slate-500 hover:underline">
          &larr; Cupons
        </Link>
        <h2 className="text-base font-medium text-slate-900">Gerar cupom manual</h2>
      </div>
      <EmitirCupomForm niveis={niveis ?? []} parceiros={parceiros ?? []} />
    </div>
  )
}
