import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DataTable } from '@/components/data-table'
import type { Database, DisparoStatus } from '@/lib/types/database.types'
import { enviarDisparoAgendado, cancelarDisparo } from './actions'
import { ExcluirDisparoButton } from './excluir-disparo-button'

type Segmento = {
  tipo?: 'todos' | 'parceiro' | 'inativos' | 'aniversariantes' | 'saldo_minimo' | 'nunca_resgataram' | 'grupo'
}

type DisparoComParceiro = Database['public']['Tables']['disparos']['Row'] & {
  parceiros: { nome: string } | null
}

const STATUS_CORES: Record<DisparoStatus, string> = {
  rascunho: 'text-slate-500',
  agendado: 'text-amber-600',
  enviando: 'text-blue-600',
  enviado: 'text-emerald-600',
  cancelado: 'text-red-600',
}

export default async function AdminDisparosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const abaAtual = tab === 'grupo' ? 'grupo' : 'individual'

  const supabase = await createClient()
  const { data: disparos } = await supabase
    .from('disparos')
    .select('*, parceiros(nome)')
    .order('created_at', { ascending: false })
    .returns<DisparoComParceiro[]>()

  const todos = disparos ?? []
  const disparosIndividuais = todos.filter((d) => (d.segmento as Segmento | null)?.tipo !== 'grupo')
  const disparosGrupo = todos.filter((d) => (d.segmento as Segmento | null)?.tipo === 'grupo')

  const linhas = abaAtual === 'grupo' ? disparosGrupo : disparosIndividuais

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-slate-900">Disparos</h2>
        <Link
          href={abaAtual === 'grupo' ? '/admin/disparos/grupo/novo' : '/admin/disparos/novo'}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
        >
          Nova campanha
        </Link>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <Link
          href="/admin/disparos"
          className={`px-4 py-2 text-sm font-medium ${
            abaAtual === 'individual' ? 'border-b-2 border-primary text-primary' : 'text-slate-500'
          }`}
        >
          Individual
        </Link>
        <Link
          href="/admin/disparos?tab=grupo"
          className={`px-4 py-2 text-sm font-medium ${
            abaAtual === 'grupo' ? 'border-b-2 border-primary text-primary' : 'text-slate-500'
          }`}
        >
          Grupo
        </Link>
      </div>

      <DataTable
        rows={linhas}
        emptyMessage={abaAtual === 'grupo' ? 'Nenhum disparo de grupo cadastrado ainda.' : 'Nenhum disparo cadastrado ainda.'}
        columns={[
          { header: 'Titulo', accessor: (d) => d.titulo },
          ...(abaAtual === 'individual'
            ? [{ header: 'Escopo', accessor: (d: DisparoComParceiro) => d.parceiros?.nome ?? 'Clube HN (global)' }]
            : []),
          { header: 'Canal', accessor: (d) => d.canal },
          {
            header: 'Status',
            accessor: (d) => <span className={STATUS_CORES[d.status]}>{d.status}</span>,
          },
          {
            header: 'Agendado para',
            accessor: (d) => (d.agendado_para ? new Date(d.agendado_para).toLocaleString('pt-BR') : '-'),
          },
          {
            header: 'Destinatarios',
            accessor: (d) => `${d.total_enviados}/${d.total_destinatarios}`,
          },
          {
            header: 'Acoes',
            accessor: (d) => (
              <div className="flex items-center gap-3">
                {d.status === 'agendado' && (
                  <>
                    <form action={enviarDisparoAgendado.bind(null, d.id)}>
                      <button type="submit" className="text-sm text-slate-600 underline">
                        Enviar agora
                      </button>
                    </form>
                    <form action={cancelarDisparo.bind(null, d.id)}>
                      <button type="submit" className="text-sm text-red-600 underline">
                        Cancelar
                      </button>
                    </form>
                  </>
                )}
                {(d.status === 'rascunho' || d.status === 'agendado') && (
                  <Link
                    href={abaAtual === 'grupo' ? `/admin/disparos/grupo/${d.id}/editar` : `/admin/disparos/${d.id}/editar`}
                    className="text-sm text-slate-600 underline"
                  >
                    Editar
                  </Link>
                )}
                <ExcluirDisparoButton disparoId={d.id} titulo={d.titulo} />
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
