'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { criarAtendenteAdmin } from './actions'

type FormState = { error?: string; ok?: boolean }

const initialState: FormState = { error: undefined, ok: undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {pending ? 'Salvando...' : 'Adicionar atendente'}
    </button>
  )
}

export function NovoAtendenteAdminForm({ parceiroId }: { parceiroId: string }) {
  const [state, formAction] = useFormState(criarAtendenteAdmin, initialState)

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="parceiro_id" value={parceiroId} />
      <div>
        <label htmlFor="atendente_nome" className="block text-sm font-medium text-slate-700">
          Nome
        </label>
        <input
          id="atendente_nome"
          name="nome"
          required
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="atendente_pin" className="block text-sm font-medium text-slate-700">
          PIN (4 a 6 digitos)
        </label>
        <input
          id="atendente_pin"
          name="pin"
          inputMode="numeric"
          pattern="[0-9]{4,6}"
          required
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>
      <SubmitButton />
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="w-full text-sm text-emerald-600">Atendente cadastrado.</p>}
    </form>
  )
}
