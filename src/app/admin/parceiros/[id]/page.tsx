import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ParceiroForm } from '../parceiro-form'
import { UsuarioParceiroForm } from '../usuario-parceiro-form'
import { AtendentesSection } from '../atendentes-section'
import { alternarAtivoParceiro, atualizarParceiro } from '../actions'

export default async function AdminParceiroDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: parceiro }, { data: usuario }, { data: atendentes }] = await Promise.all([
    supabase.from('parceiros').select('*').eq('id', id).maybeSingle(),
    supabase.from('perfis').select('id, email').eq('parceiro_id', id).eq('role', 'parceiro').maybeSingle(),
    supabase.from('atendentes').select('id, nome, ativo').eq('parceiro_id', id).order('nome'),
  ])

  if (!parceiro) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/parceiros" className="text-sm text-slate-500 hover:underline">
            &larr; Parceiros
          </Link>
          <h2 className="text-base font-medium text-slate-900">{parceiro.nome}</h2>
        </div>
        <form action={alternarAtivoParceiro.bind(null, parceiro.id, !parceiro.ativo)}>
          <button
            type="submit"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              parceiro.ativo
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {parceiro.ativo ? 'Desativar parceiro' : 'Ativar parceiro'}
          </button>
        </form>
      </div>

      <ParceiroForm parceiro={parceiro} action={atualizarParceiro} submitLabel="Salvar alteracoes" />

      <UsuarioParceiroForm parceiroId={parceiro.id} usuario={usuario} />

      <AtendentesSection parceiroId={parceiro.id} atendentes={atendentes ?? []} />
    </div>
  )
}
