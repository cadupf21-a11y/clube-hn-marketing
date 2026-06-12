import { createClient } from '@/lib/supabase/server'
import { DataTable, type Column } from '@/components/data-table'

type RankingParceiro = {
  parceiro_id: string
  nome: string
  pontos_gerados: number
  total_transacoes: number
  cupons_resgatados: number
}

async function getDashboardData() {
  const supabase = await createClient()

  const [statsResult, rankingResult] = await Promise.all([
    supabase.rpc('admin_dashboard_stats').single(),
    supabase.rpc('admin_ranking_parceiros', { p_limite: 10 }),
  ])

  const stats = statsResult.data ?? {
    membros_ativos: 0,
    pontos_gerados_hoje: 0,
    cupons_ativos: 0,
    resgates_hoje: 0,
  }

  const ranking = (rankingResult.data ?? []) as RankingParceiro[]

  return { stats, ranking }
}

export default async function AdminHome() {
  const { stats, ranking } = await getDashboardData()

  const cards = [
    { label: 'Membros ativos', value: stats.membros_ativos },
    { label: 'Pontos gerados hoje', value: stats.pontos_gerados_hoje },
    { label: 'Cupons ativos', value: stats.cupons_ativos },
    { label: 'Resgates hoje', value: stats.resgates_hoje },
  ]

  const columns: Column<RankingParceiro>[] = [
    { header: 'Parceiro', accessor: (row) => row.nome },
    { header: 'Pontos gerados', accessor: (row) => row.pontos_gerados },
    { header: 'Transacoes', accessor: (row) => row.total_transacoes },
    { header: 'Cupons resgatados', accessor: (row) => row.cupons_resgatados },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-base font-medium text-slate-900">Visao geral</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-base font-medium text-slate-900">Ranking de parceiros</h2>
        <DataTable columns={columns} rows={ranking} emptyMessage="Nenhum parceiro com movimentacao ainda." />
      </div>
    </div>
  )
}
