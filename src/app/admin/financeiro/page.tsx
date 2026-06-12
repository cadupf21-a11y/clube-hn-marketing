import { createClient } from '@/lib/supabase/server'
import { DataTable } from '@/components/data-table'
import type { Database, MensalidadeStatus } from '@/lib/types/database.types'
import { NovoPlanoForm } from './novo-plano-form'
import { NovaMensalidadeForm } from './nova-mensalidade-form'
import { alternarAtivoPlano, atualizarStatusMensalidade } from './actions'

type MensalidadeComRelacoes = Database['public']['Tables']['mensalidades']['Row'] & {
  parceiros: { nome: string } | null
  planos: { nome: string } | null
}

const STATUS_CORES: Record<MensalidadeStatus, string> = {
  pendente: 'text-amber-600',
  pago: 'text-emerald-600',
  atrasado: 'text-red-600',
  cancelado: 'text-slate-400',
}

const PROXIMOS_STATUS: Record<MensalidadeStatus, MensalidadeStatus[]> = {
  pendente: ['pago', 'atrasado', 'cancelado'],
  atrasado: ['pago', 'cancelado'],
  pago: ['pendente'],
  cancelado: ['pendente'],
}

export default async function AdminFinanceiroPage() {
  const supabase = await createClient()

  const [{ data: planos }, { data: parceiros }, { data: mensalidades }] = await Promise.all([
    supabase.from('planos').select('*').order('valor_mensal'),
    supabase.from('parceiros').select('id, nome').eq('ativo', true).order('nome'),
    supabase
      .from('mensalidades')
      .select('*, parceiros(nome), planos(nome)')
      .order('competencia', { ascending: false })
      .limit(100)
      .returns<MensalidadeComRelacoes[]>(),
  ])

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-base font-medium text-slate-900">Planos</h2>
        <NovoPlanoForm />
        <DataTable
          rows={planos ?? []}
          emptyMessage="Nenhum plano cadastrado ainda."
          columns={[
            { header: 'Nome', accessor: (p) => p.nome },
            { header: 'Valor mensal', accessor: (p) => `R$ ${p.valor_mensal}` },
            { header: 'Descricao', accessor: (p) => p.descricao ?? '-' },
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
                <form action={alternarAtivoPlano.bind(null, p.id, !p.ativo)}>
                  <button type="submit" className="text-sm text-slate-600 underline">
                    {p.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </form>
              ),
            },
          ]}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-medium text-slate-900">Mensalidades</h2>
        <NovaMensalidadeForm parceiros={parceiros ?? []} planos={(planos ?? []).filter((p) => p.ativo)} />
        <DataTable
          rows={mensalidades ?? []}
          emptyMessage="Nenhuma mensalidade gerada ainda."
          columns={[
            { header: 'Parceiro', accessor: (m) => m.parceiros?.nome ?? '-' },
            { header: 'Plano', accessor: (m) => m.planos?.nome ?? '-' },
            {
              header: 'Competencia',
              accessor: (m) =>
                new Date(`${m.competencia}T00:00:00`).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
            },
            { header: 'Valor', accessor: (m) => `R$ ${m.valor}` },
            { header: 'Vencimento', accessor: (m) => new Date(`${m.vencimento}T00:00:00`).toLocaleDateString('pt-BR') },
            {
              header: 'Status',
              accessor: (m) => <span className={STATUS_CORES[m.status]}>{m.status}</span>,
            },
            {
              header: 'Acoes',
              accessor: (m) => (
                <div className="flex flex-wrap items-center gap-2">
                  {PROXIMOS_STATUS[m.status].map((novoStatus) => (
                    <form key={novoStatus} action={atualizarStatusMensalidade.bind(null, m.id, novoStatus)}>
                      <button type="submit" className="text-sm text-slate-600 underline">
                        Marcar {novoStatus}
                      </button>
                    </form>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
