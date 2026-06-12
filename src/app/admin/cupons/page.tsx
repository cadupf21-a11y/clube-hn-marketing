import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DataTable } from '@/components/data-table'
import type { Database, CupomStatus } from '@/lib/types/database.types'
import { ExcluirCupomButton } from './excluir-cupom-button'

type CupomComRelacoes = Database['public']['Tables']['cupons']['Row'] & {
  membros: { nome: string } | null
  parceiros: { nome: string } | null
  cupom_niveis: { nome: string } | null
}

const STATUS_OPCOES: CupomStatus[] = ['disponivel', 'resgatado', 'expirado', 'cancelado']

export default async function AdminCuponsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; parceiro_id?: string; de?: string; ate?: string }>
}) {
  const { status, parceiro_id, de, ate } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('cupons')
    .select('*, membros(nome), parceiros(nome), cupom_niveis(nome)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && (STATUS_OPCOES as string[]).includes(status)) {
    query = query.eq('status', status as CupomStatus)
  }
  if (parceiro_id) {
    query = query.eq('parceiro_id', parceiro_id)
  }
  if (de) {
    query = query.gte('data_emissao', de)
  }
  if (ate) {
    query = query.lte('data_emissao', `${ate}T23:59:59`)
  }

  const [{ data: cupons }, { data: parceiros }] = await Promise.all([
    query.returns<CupomComRelacoes[]>(),
    supabase.from('parceiros').select('id, nome').order('nome'),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-slate-900">Cupons</h2>
        <Link
          href="/admin/cupons/novo"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
        >
          Gerar cupom manual
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-slate-700">Status</label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ''}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">Todos</option>
            {STATUS_OPCOES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="parceiro_id" className="block text-sm font-medium text-slate-700">Parceiro</label>
          <select
            id="parceiro_id"
            name="parceiro_id"
            defaultValue={parceiro_id ?? ''}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">Todos</option>
            {(parceiros ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="de" className="block text-sm font-medium text-slate-700">Emitido de</label>
          <input
            id="de"
            name="de"
            type="date"
            defaultValue={de ?? ''}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="ate" className="block text-sm font-medium text-slate-700">Emitido ate</label>
          <input
            id="ate"
            name="ate"
            type="date"
            defaultValue={ate ?? ''}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Filtrar
        </button>
      </form>

      <DataTable
        rows={cupons ?? []}
        emptyMessage="Nenhum cupom encontrado."
        columns={[
          { header: 'Codigo', accessor: (c) => c.codigo },
          { header: 'Membro', accessor: (c) => c.membros?.nome ?? '-' },
          { header: 'Nivel', accessor: (c) => c.cupom_niveis?.nome ?? '-' },
          { header: 'Parceiro', accessor: (c) => c.parceiros?.nome ?? 'Clube HN' },
          { header: 'Pontos', accessor: (c) => c.pontos_utilizados },
          {
            header: 'Status',
            accessor: (c) => {
              const cores: Record<CupomStatus, string> = {
                disponivel: 'text-emerald-600',
                resgatado: 'text-slate-500',
                expirado: 'text-amber-600',
                cancelado: 'text-red-600',
              }
              return <span className={cores[c.status]}>{c.status}</span>
            },
          },
          { header: 'Emissao', accessor: (c) => new Date(c.data_emissao).toLocaleDateString('pt-BR') },
          { header: 'Validade', accessor: (c) => new Date(c.data_validade).toLocaleDateString('pt-BR') },
          {
            header: 'Acoes',
            accessor: (c) => (
              <div className="flex items-center gap-3">
                <Link href={`/admin/cupons/${c.id}`} className="text-sm text-slate-600 underline">
                  Detalhes
                </Link>
                <ExcluirCupomButton cupomId={c.id} codigo={c.codigo} />
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
