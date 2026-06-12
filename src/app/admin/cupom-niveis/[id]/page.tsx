import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NivelForm } from '../nivel-form'

export default async function EditarNivelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: nivel }, { data: parceiros }, { data: vinculos }] = await Promise.all([
    supabase.from('cupom_niveis').select('*').eq('id', id).maybeSingle(),
    supabase.from('parceiros').select('id, nome').eq('ativo', true).order('nome'),
    supabase.from('cupom_nivel_parceiros').select('parceiro_id').eq('cupom_nivel_id', id),
  ])

  if (!nivel) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/cupom-niveis" className="text-sm text-slate-500 hover:underline">
          &larr; Configuracoes
        </Link>
        <h2 className="text-base font-medium text-slate-900">Editar nivel: {nivel.nome}</h2>
      </div>
      <NivelForm
        nivel={nivel}
        parceiros={parceiros ?? []}
        parceiroIdsSelecionados={(vinculos ?? []).map((v) => v.parceiro_id)}
      />
    </div>
  )
}
