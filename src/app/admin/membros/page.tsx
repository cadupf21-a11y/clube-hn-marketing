import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DataTable } from '@/components/data-table'
import { ExportarCsvButton } from './exportar-csv-button'

export default async function AdminMembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const termo = (q ?? '').trim()

  const supabase = await createClient()
  let query = supabase
    .from('membros')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (termo) {
    query = query.or(`nome.ilike.%${termo}%,telefone.ilike.%${termo}%`)
  }

  const { data: membros } = await query

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-slate-900">Clientes</h2>
      </div>

      <div className="flex items-center justify-between gap-2">
        <form className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={termo}
            placeholder="Buscar por nome ou telefone"
            className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Buscar
          </button>
        </form>

        <ExportarCsvButton />
      </div>

      <DataTable
        rows={membros ?? []}
        emptyMessage="Nenhum membro encontrado."
        columns={[
          {
            header: 'Nome',
            accessor: (m) => (
              <Link href={`/admin/membros/${m.id}`} className="font-medium text-slate-900 hover:underline">
                {m.nome}
              </Link>
            ),
          },
          { header: 'Telefone', accessor: (m) => m.telefone },
          { header: 'Nivel', accessor: (m) => m.nivel },
          { header: 'Pontos', accessor: (m) => m.pontos_saldo },
          {
            header: 'Status',
            accessor: (m) => (
              <span className={m.ativo ? 'text-emerald-600' : 'text-red-600'}>
                {m.ativo ? 'Ativo' : 'Bloqueado'}
              </span>
            ),
          },
        ]}
      />
    </div>
  )
}
