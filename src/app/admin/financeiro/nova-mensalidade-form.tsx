'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { criarMensalidade } from './actions'

const initialState = { error: undefined as string | undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {pending ? 'Gerando...' : 'Gerar mensalidade'}
    </button>
  )
}

export function NovaMensalidadeForm({
  parceiros,
  planos,
}: {
  parceiros: { id: string; nome: string }[]
  planos: { id: string; nome: string; valor_mensal: number }[]
}) {
  const [state, formAction] = useFormState(criarMensalidade, initialState)

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label htmlFor="parceiro_id" className="block text-sm font-medium text-slate-700">Parceiro</label>
        <select
          id="parceiro_id"
          name="parceiro_id"
          required
          defaultValue=""
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="" disabled>
            Selecione um parceiro
          </option>
          {parceiros.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="plano_id" className="block text-sm font-medium text-slate-700">Plano</label>
        <select
          id="plano_id"
          name="plano_id"
          defaultValue=""
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="">Sem plano</option>
          {planos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} (R$ {p.valor_mensal})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="competencia" className="block text-sm font-medium text-slate-700">Competencia</label>
        <input
          id="competencia"
          name="competencia"
          type="month"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="valor" className="block text-sm font-medium text-slate-700">Valor (R$)</label>
        <input
          id="valor"
          name="valor"
          type="number"
          step="0.01"
          min="0"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="vencimento" className="block text-sm font-medium text-slate-700">Vencimento</label>
        <input
          id="vencimento"
          name="vencimento"
          type="date"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="observacao" className="block text-sm font-medium text-slate-700">Observacao</label>
        <input
          id="observacao"
          name="observacao"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="lg:col-span-3 flex items-center gap-3">
        <SubmitButton />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  )
}
