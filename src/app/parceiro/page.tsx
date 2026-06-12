import { createClient } from '@/lib/supabase/server'
import { getPerfilAtual } from '@/lib/auth/perfil'

type DashboardStats = {
  membros_ativos: number
  pontos_gerados: number
  cupons_resgatados: number
  desconto_concedido: number
  novos_clientes_mes: number
}

async function getStats(): Promise<DashboardStats | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('parceiro_dashboard_stats').single()
  if (error || !data) return null
  return data as DashboardStats
}

export default async function ParceiroHome() {
  const perfil = await getPerfilAtual()
  const stats = perfil?.parceiro_id ? await getStats() : null

  const cards = [
    { label: 'Membros ativos', value: stats?.membros_ativos ?? 0 },
    { label: 'Pontos gerados', value: stats?.pontos_gerados ?? 0 },
    { label: 'Cupons resgatados', value: stats?.cupons_resgatados ?? 0 },
    {
      label: 'Desconto concedido',
      value: (stats?.desconto_concedido ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    },
  ]

  return (
    <div>
      <h2 className="mb-4 text-base font-medium text-slate-900">Visao geral</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Clientes novos vindos do clube neste mes</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{stats?.novos_clientes_mes ?? 0}</p>
        <p className="mt-1 text-xs text-slate-400">
          Membros que se cadastraram no Clube HN por indicacao deste estabelecimento neste mes.
        </p>
      </div>
    </div>
  )
}
