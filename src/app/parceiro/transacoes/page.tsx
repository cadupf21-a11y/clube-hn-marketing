import { createClient } from '@/lib/supabase/server'
import { getPerfilAtual } from '@/lib/auth/perfil'
import { DataTable } from '@/components/data-table'
import { Pagination } from '@/components/pagination'
import type { Database } from '@/lib/types/database.types'

type TransacaoComRelacoes = Database['public']['Tables']['transacoes']['Row'] & {
  membros: { nome: string } | null
  atendentes: { nome: string } | null
}

const PAGE_SIZE = 50

export default async function ParceiroTransacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const perfil = await getPerfilAtual()
  const supabase = await createClient()

  const { data: transacoes, count } = await supabase
    .from('transacoes')
    .select('*, membros(nome), atendentes(nome)', { count: 'exact' })
    .eq('parceiro_id', perfil!.parceiro_id!)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
    .returns<TransacaoComRelacoes[]>()
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <div>
      <h2 className="mb-4 text-base font-medium text-slate-900">Transacoes</h2>
      <DataTable
        rows={transacoes ?? []}
        emptyMessage="Nenhuma transacao lancada ainda."
        columns={[
          { header: 'Membro', accessor: (t) => t.membros?.nome ?? '-' },
          { header: 'Tipo', accessor: (t) => t.tipo },
          { header: 'Pontos', accessor: (t) => t.pontos },
          { header: 'Valor da compra', accessor: (t) => (t.valor_compra != null ? `R$ ${t.valor_compra}` : '-') },
          { header: 'Atendente', accessor: (t) => t.atendentes?.nome ?? '-' },
          { header: 'Data', accessor: (t) => new Date(t.created_at).toLocaleString('pt-BR') },
        ]}
      />

      <Pagination page={page} totalPages={totalPages} basePath="/parceiro/transacoes" />
    </div>
  )
}
