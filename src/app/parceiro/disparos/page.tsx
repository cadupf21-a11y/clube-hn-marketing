import { createClient } from '@/lib/supabase/server'
import { getPerfilAtual } from '@/lib/auth/perfil'
import { DataTable } from '@/components/data-table'

export default async function ParceiroDisparosPage() {
  const perfil = await getPerfilAtual()
  const supabase = await createClient()

  const { data: disparos } = await supabase
    .from('disparos')
    .select('*')
    .or(`parceiro_id.is.null,parceiro_id.eq.${perfil!.parceiro_id}`)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h2 className="mb-4 text-base font-medium text-slate-900">Disparos</h2>
      <p className="mb-4 text-sm text-slate-500">
        Campanhas globais do Clube HN e disparos criados pelo seu estabelecimento.
      </p>
      <DataTable
        rows={disparos ?? []}
        emptyMessage="Nenhum disparo cadastrado ainda."
        columns={[
          { header: 'Titulo', accessor: (d) => d.titulo },
          { header: 'Escopo', accessor: (d) => (d.parceiro_id ? 'Meu estabelecimento' : 'Clube HN (global)') },
          { header: 'Canal', accessor: (d) => d.canal },
          { header: 'Status', accessor: (d) => d.status },
        ]}
      />
    </div>
  )
}
