'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { criarPlano } from './actions'

const initialState = { error: undefined as string | undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
    >
      {pending ? 'Salvando...' : 'Adicionar plano'}
    </button>
  )
}

export function NovoPlanoForm() {
  const [state, formAction] = useFormState(criarPlano, initialState)

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome do plano</label>
        <input
          id="nome"
          name="nome"
          required
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="valor_mensal" className="block text-sm font-medium text-slate-700">Valor mensal (R$)</label>
        <input
          id="valor_mensal"
          name="valor_mensal"
          type="number"
          step="0.01"
          min="0"
          required
          className="mt-1 w-32 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="flex-1 min-w-[200px]">
        <label htmlFor="descricao" className="block text-sm font-medium text-slate-700">Descricao</label>
        <input
          id="descricao"
          name="descricao"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <SubmitButton />
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
