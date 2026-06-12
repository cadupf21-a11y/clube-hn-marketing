import { NovoAtendenteAdminForm } from './novo-atendente-admin-form'
import { RedefinirPinAtendenteForm } from './redefinir-pin-atendente-form'
import { ExcluirAtendenteButton } from './excluir-atendente-button'
import { alternarAtivoAtendenteAdmin } from './actions'

type Atendente = {
  id: string
  nome: string
  ativo: boolean
}

export function AtendentesSection({ parceiroId, atendentes }: { parceiroId: string; atendentes: Atendente[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-slate-900">Atendentes</h3>
      <p className="mb-3 text-sm text-slate-500">
        Cada atendente usa um PIN proprio para identificar quem lancou pontos ou resgatou cupons no PDV.
      </p>

      <NovoAtendenteAdminForm parceiroId={parceiroId} />

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-primary-dark">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-white">Nome</th>
              <th className="px-4 py-2 text-left font-medium text-white">Status</th>
              <th className="px-4 py-2 text-left font-medium text-white">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {atendentes.map((a, i) => (
              <tr key={a.id} className={i % 2 === 1 ? 'bg-appbg' : 'bg-white'}>
                <td className="px-4 py-2 text-slate-700">{a.nome}</td>
                <td className="px-4 py-2 text-slate-700">{a.ativo ? 'Ativo' : 'Inativo'}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <RedefinirPinAtendenteForm parceiroId={parceiroId} atendenteId={a.id} />
                    <form action={alternarAtivoAtendenteAdmin.bind(null, parceiroId, a.id, !a.ativo)}>
                      <button type="submit" className="text-sm text-slate-600 underline">
                        {a.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </form>
                    <ExcluirAtendenteButton parceiroId={parceiroId} atendenteId={a.id} nome={a.nome} />
                  </div>
                </td>
              </tr>
            ))}
            {atendentes.length === 0 && (
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
