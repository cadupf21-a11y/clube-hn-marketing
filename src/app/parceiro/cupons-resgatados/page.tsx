import { createClient } from '@/lib/supabase/server'
import { getPerfilAtual } from '@/lib/auth/perfil'
import { DataTable } from '@/components/data-table'
import type { Database } from '@/lib/types/database.types'

type CupomResgatado = Database['public']['Tables']['cupons']['Row'] & {
  membros: { nome: string } | null
  cupom_niveis: { nome: string; tipo_beneficio: string; valor_beneficio: number | null } | null
}

function formatarDesconto(nivel: CupomResgatado['cupom_niveis']) {
  if (!nivel || nivel.valor_beneficio == null) return '-'
  if (nivel.tipo_beneficio === 'desconto_percentual') return `${nivel.valor_beneficio}%`
  if (nivel.tipo_beneficio === 'desconto_valor') {
    return nivel.valor_beneficio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  return nivel.nome
}

export default async function ParceiroCuponsResgatadosPage() {
  const perfil = await getPerfilAtual()
  const supabase = await createClient()

  const { data: cupons } = await supabase
    .from('cupons')
    .select('*, membros(nome), cupom_niveis(nome, tipo_beneficio, valor_beneficio)')
    .eq('parceiro_id', perfil!.parceiro_id!)
    .eq('status', 'resgatado')
    .order('data_resgate', { ascending: false })
    .limit(100)
    .returns<CupomResgatado[]>()

  return (
    <div className="space-y-4">
      <h2 className="text-base font-medium text-slate-900">Cupons resgatados</h2>
      <p className="text-sm text-slate-500">Cupons ja utilizados pelos clientes neste estabelecimento.</p>

      <DataTable
        rows={cupons ?? []}
        emptyMessage="Nenhum cupom resgatado ainda."
        columns={[
          { header: 'Codigo', accessor: (c) => c.codigo },
          { header: 'Membro', accessor: (c) => c.membros?.nome ?? '-' },
          { header: 'Beneficio', accessor: (c) => c.cupom_niveis?.nome ?? '-' },
          { header: 'Desconto', accessor: (c) => formatarDesconto(c.cupom_niveis) },
          {
            header: 'Data',
            accessor: (c) => (c.data_resgate ? new Date(c.data_resgate).toLocaleDateString('pt-BR') : '-'),
          },
        ]}
      />
    </div>
  )
}
