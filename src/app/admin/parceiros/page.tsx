import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DataTable } from '@/components/data-table'
import { ExcluirParceiroButton } from './excluir-parceiro-button'

export default async function AdminParceirosPage() {
  const supabase = await createClient()
  const { data: parceiros } = await supabase
    .from('parceiros')
    .select('*')
    .order('nome')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-slate-900">Parceiros</h2>
        <Link
          href="/admin/parceiros/novo"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
        >
          Novo parceiro
        </Link>
      </div>
      <DataTable
        rows={parceiros ?? []}
        emptyMessage="Nenhum parceiro cadastrado ainda."
        columns={[
          {
            header: 'Nome',
            accessor: (p) => (
              <Link href={`/admin/parceiros/${p.id}`} className="font-medium text-slate-900 hover:underline">
                {p.nome}
              </Link>
            ),
          },
          { header: 'Categoria', accessor: (p) => p.categoria ?? '-' },
          { header: 'Cidade/UF', accessor: (p) => [p.cidade, p.estado].filter(Boolean).join('/') || '-' },
          { header: 'Taxa de conversao', accessor: (p) => p.taxa_conversao_pontos },
          { header: 'Teto mensal', accessor: (p) => p.teto_pontos_mensal ?? '-' },
          {
            header: 'Status',
            accessor: (p) => (
              <span className={p.ativo ? 'text-emerald-600' : 'text-red-600'}>
                {p.ativo ? 'Ativo' : 'Inativo'}
              </span>
            ),
          },
          {
            header: 'Acoes',
            accessor: (p) => (
              <div className="flex items-center gap-3">
                <Link href={`/admin/parceiros/${p.id}`} className="text-sm text-slate-600 underline">
                  Editar
                </Link>
                <ExcluirParceiroButton parceiroId={p.id} nome={p.nome} />
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
