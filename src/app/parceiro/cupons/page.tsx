import { createClient } from '@/lib/supabase/server'
import { getPerfilAtual } from '@/lib/auth/perfil'
import { DataTable } from '@/components/data-table'
import type { Database } from '@/lib/types/database.types'

type CupomComRelacoes = Database['public']['Tables']['cupons']['Row'] & {
  membros: { nome: string } | null
  cupom_niveis: { nome: string } | null
}

export default async function ParceiroCuponsPage() {
  const perfil = await getPerfilAtual()
  const supabase = await createClient()

  const { data: cupons } = await supabase
    .from('cupons')
    .select('*, membros(nome), cupom_niveis(nome)')
    .eq('parceiro_id', perfil!.parceiro_id!)
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<CupomComRelacoes[]>()

  return (
    <div>
      <h2 className="mb-4 text-base font-medium text-slate-900">Cupons emitidos</h2>
      <DataTable
        rows={cupons ?? []}
        emptyMessage="Nenhum cupom emitido ainda."
        columns={[
          { header: 'Codigo', accessor: (c) => c.codigo },
          { header: 'Membro', accessor: (c) => c.membros?.nome ?? '-' },
          { header: 'Nivel', accessor: (c) => c.cupom_niveis?.nome ?? '-' },
          { header: 'Status', accessor: (c) => c.status },
          { header: 'Validade', accessor: (c) => new Date(c.data_validade).toLocaleDateString('pt-BR') },
        ]}
      />
    </div>
  )
}
