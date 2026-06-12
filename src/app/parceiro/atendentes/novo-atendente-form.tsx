'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { criarAtendente } from './actions'

const initialState = { error: undefined as string | undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
    >
      {pending ? 'Salvando...' : 'Adicionar atendente'}
    </button>
  )
}

export function NovoAtendenteForm() {
  const [state, formAction] = useFormState(criarAtendente, initialState)

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-slate-700">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="pin" className="block text-sm font-medium text-slate-700">
          PIN (4 a 6 digitos)
        </label>
        <input
          id="pin"
          name="pin"
          inputMode="numeric"
          pattern="[0-9]{4,6}"
          required
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>
      <SubmitButton />
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
