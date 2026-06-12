import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DataTable } from '@/components/data-table'
import type { Database } from '@/lib/types/database.types'
import { alternarAtivoNivel, excluirNivel } from './actions'

type CupomNivelComParceiro = Database['public']['Tables']['cupom_niveis']['Row'] & {
  parceiros: { nome: string } | null
}

export default async function AdminCupomNiveisPage() {
  const supabase = await createClient()
  const [{ data: niveis }, { data: vinculos }] = await Promise.all([
    supabase
      .from('cupom_niveis')
      .select('*, parceiros!cupom_niveis_parceiro_id_fkey(nome)')
      .order('pontos_necessarios')
      .returns<CupomNivelComParceiro[]>(),
    supabase.from('cupom_nivel_parceiros').select('cupom_nivel_id, parceiros(nome)'),
  ])

  const parceirosAceitosPorNivel = new Map<string, string[]>()
  for (const vinculo of vinculos ?? []) {
    const nome = (vinculo.parceiros as { nome: string } | null)?.nome
    if (!nome) continue
    const lista = parceirosAceitosPorNivel.get(vinculo.cupom_nivel_id) ?? []
    lista.push(nome)
    parceirosAceitosPorNivel.set(vinculo.cupom_nivel_id, lista)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-slate-900">Configuracoes — Niveis de cupom</h2>
        <Link
          href="/admin/cupom-niveis/novo"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
        >
          Novo nivel
        </Link>
      </div>
      <DataTable
        rows={niveis ?? []}
        emptyMessage="Nenhum nivel de cupom cadastrado ainda."
        columns={[
          {
            header: 'Nome',
            accessor: (n) => (
              <Link href={`/admin/cupom-niveis/${n.id}`} className="font-medium text-slate-900 hover:underline">
                {n.nome}
              </Link>
            ),
          },
          { header: 'Escopo', accessor: (n) => n.parceiros?.nome ?? 'Clube HN (global)' },
          {
            header: 'Parceiros aceitos',
            accessor: (n) => parceirosAceitosPorNivel.get(n.id)?.join(', ') ?? 'Todos os parceiros',
          },
          { header: 'Pontos necessarios', accessor: (n) => n.pontos_necessarios },
          { header: 'Beneficio', accessor: (n) => n.tipo_beneficio },
          { header: 'Validade (dias)', accessor: (n) => n.validade_dias },
          {
            header: 'Status',
            accessor: (n) => (
              <span className={n.ativo ? 'text-emerald-600' : 'text-red-600'}>
                {n.ativo ? 'Ativo' : 'Inativo'}
              </span>
            ),
          },
          {
            header: 'Acoes',
            accessor: (n) => (
              <div className="flex items-center gap-3">
                <Link href={`/admin/cupom-niveis/${n.id}`} className="text-sm text-slate-600 underline">
                  Editar
                </Link>
                <form action={alternarAtivoNivel.bind(null, n.id, !n.ativo)}>
                  <button type="submit" className="text-sm text-slate-600 underline">
                    {n.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </form>
                <form action={excluirNivel.bind(null, n.id)}>
                  <button type="submit" className="text-sm text-red-600 underline">
                    Excluir
                  </button>
                </form>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
