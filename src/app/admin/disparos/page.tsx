import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DataTable } from '@/components/data-table'
import type { Database, DisparoStatus } from '@/lib/types/database.types'
import { enviarDisparoAgendado, cancelarDisparo } from './actions'

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

export default async function AdminDisparosPage() {
  const supabase = await createClient()
  const { data: disparos } = await supabase
    .from('disparos')
    .select('*, parceiros(nome)')
    .order('created_at', { ascending: false })
    .returns<DisparoComParceiro[]>()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-slate-900">Disparos</h2>
        <Link
          href="/admin/disparos/novo"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
        >
          Nova campanha
        </Link>
      </div>
      <DataTable
        rows={disparos ?? []}
        emptyMessage="Nenhum disparo cadastrado ainda."
        columns={[
          { header: 'Titulo', accessor: (d) => d.titulo },
          { header: 'Escopo', accessor: (d) => d.parceiros?.nome ?? 'Clube HN (global)' },
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
            accessor: (d) =>
              d.status === 'agendado' ? (
                <div className="flex items-center gap-3">
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
                </div>
              ) : (
                '-'
              ),
          },
        ]}
      />
    </div>
  )
}
