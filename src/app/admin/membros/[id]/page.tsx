import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DataTable } from '@/components/data-table'
import type { Database } from '@/lib/types/database.types'
import { EditarMembroForm } from './editar-membro-form'
import { AjustarPontosForm } from './ajustar-pontos-form'
import { AlternarAtivoMembroButton } from './alternar-ativo-membro-button'

type TransacaoComRelacoes = Database['public']['Tables']['transacoes']['Row'] & {
  parceiros: { nome: string } | null
}

export default async function AdminMembroDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: membro }, { data: transacoes }, { data: parceiros }] = await Promise.all([
    supabase.from('membros').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('transacoes')
      .select('*, parceiros(nome)')
      .eq('membro_id', id)
      .order('created_at', { ascending: false })
      .limit(20)
      .returns<TransacaoComRelacoes[]>(),
    supabase.from('parceiros').select('id, nome').eq('ativo', true).order('nome'),
  ])

  if (!membro) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/membros" className="text-sm text-slate-500 hover:underline">
            &larr; Clientes
          </Link>
          <h2 className="text-base font-medium text-slate-900">{membro.nome}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            Saldo atual: <span className="font-semibold text-slate-900">{membro.pontos_saldo}</span> pts
          </span>
          <AlternarAtivoMembroButton membroId={membro.id} ativo={membro.ativo} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-900">Dados cadastrais</h3>
        <EditarMembroForm membro={membro} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-900">Adicionar pontos manuais</h3>
        <AjustarPontosForm
          membroId={membro.id}
          parceiros={parceiros ?? []}
          parceiroPadraoId={membro.origem_parceiro_id}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-900">Historico de transacoes</h3>
        <DataTable
          rows={transacoes ?? []}
          emptyMessage="Nenhuma transacao registrada para este cliente."
          columns={[
            { header: 'Data', accessor: (t) => new Date(t.created_at).toLocaleString('pt-BR') },
            { header: 'Parceiro', accessor: (t) => t.parceiros?.nome ?? '-' },
            { header: 'Tipo', accessor: (t) => t.tipo },
            { header: 'Pontos', accessor: (t) => t.pontos },
            { header: 'Descricao', accessor: (t) => t.descricao ?? '-' },
          ]}
        />
      </div>
    </div>
  )
}
