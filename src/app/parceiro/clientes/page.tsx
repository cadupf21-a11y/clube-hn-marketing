import { createClient } from '@/lib/supabase/server'
import { DataTable } from '@/components/data-table'

type ClienteParceiro = {
  membro_id: string
  nome: string
  telefone: string
  ultimo_acesso: string | null
  total_gasto: number
  pontos_gerados: number
}

export default async function ParceiroClientesPage() {
  const supabase = await createClient()
  const { data: clientes } = await supabase.rpc('parceiro_clientes').returns<ClienteParceiro[]>()

  return (
    <div className="space-y-4">
      <h2 className="text-base font-medium text-slate-900">Clientes</h2>
      <p className="text-sm text-slate-500">Membros do Clube HN que ja compraram neste estabelecimento.</p>

      <DataTable
        rows={clientes ?? []}
        emptyMessage="Nenhum cliente encontrado."
        columns={[
          { header: 'Nome', accessor: (c) => c.nome },
          { header: 'Telefone', accessor: (c) => c.telefone },
          {
            header: 'Ultimo acesso',
            accessor: (c) => (c.ultimo_acesso ? new Date(c.ultimo_acesso).toLocaleDateString('pt-BR') : '-'),
          },
          {
            header: 'Total gasto',
            accessor: (c) => c.total_gasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          },
          { header: 'Pontos gerados aqui', accessor: (c) => c.pontos_gerados },
        ]}
      />
    </div>
  )
}
