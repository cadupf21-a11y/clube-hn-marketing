import { createClient } from '@/lib/supabase/server'
import { getPerfilAtual } from '@/lib/auth/perfil'
import { NovoAtendenteForm } from './novo-atendente-form'
import { RedefinirPinForm } from './redefinir-pin-form'
import { ExcluirAtendenteButton } from './excluir-atendente-button'
import { alternarAtivo } from './actions'

export default async function ParceiroAtendentesPage() {
  const perfil = await getPerfilAtual()
  const supabase = await createClient()

  const { data: atendentes } = await supabase
    .from('atendentes')
    .select('id, nome, ativo, created_at')
    .eq('parceiro_id', perfil!.parceiro_id!)
    .order('nome')

  return (
    <div className="space-y-4">
      <h2 className="text-base font-medium text-slate-900">Atendentes</h2>
      <p className="text-sm text-slate-500">
        Cada atendente usa um PIN proprio para identificar quem lancou pontos ou resgatou cupons no PDV.
      </p>

      <NovoAtendenteForm />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Nome</th>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Status</th>
              <th className="px-4 py-2 text-left font-medium text-slate-500">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(atendentes ?? []).map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2 text-slate-700">{a.nome}</td>
                <td className="px-4 py-2 text-slate-700">{a.ativo ? 'Ativo' : 'Inativo'}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <RedefinirPinForm atendenteId={a.id} />
                    <form action={alternarAtivo.bind(null, a.id, !a.ativo)}>
                      <button type="submit" className="text-sm text-slate-600 underline">
                        {a.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </form>
                    <ExcluirAtendenteButton atendenteId={a.id} nome={a.nome} />
                  </div>
                </td>
              </tr>
            ))}
            {(atendentes ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  Nenhum atendente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
