import { createClient } from '@/lib/supabase/server'
import { DataTable } from '@/components/data-table'

const BENEFICIO_LABELS: Record<string, string> = {
  desconto_percentual: 'Desconto %',
  desconto_valor: 'Desconto R$',
  produto_gratis: 'Brinde gratuito',
  outro: 'Outro',
}

export default async function ParceiroCupomNiveisPage() {
  const supabase = await createClient()

  const { data: niveis } = await supabase.rpc('parceiro_niveis_disponiveis')

  return (
    <div>
      <h2 className="mb-4 text-base font-medium text-slate-900">Niveis de cupom</h2>
      <p className="mb-4 text-sm text-slate-500">
        Niveis globais do Clube HN e os criados pelo seu estabelecimento.
      </p>
      <DataTable
        rows={niveis ?? []}
        emptyMessage="Nenhum nivel de cupom disponivel ainda."
        columns={[
          { header: 'Nome', accessor: (n) => n.nome },
          { header: 'Escopo', accessor: (n) => (n.parceiro_id ? 'Meu estabelecimento' : 'Clube HN (global)') },
          { header: 'Pontos necessarios', accessor: (n) => n.pontos_necessarios },
          { header: 'Beneficio', accessor: (n) => BENEFICIO_LABELS[n.tipo_beneficio] ?? n.tipo_beneficio },
          { header: 'Status', accessor: (n) => (n.ativo ? 'Ativo' : 'Inativo') },
        ]}
      />
    </div>
  )
}
