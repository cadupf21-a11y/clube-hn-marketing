'use client'

import { useFormState } from 'react-dom'
import { corrigirStatusCupons } from './actions'

const initialState: { error?: string; ok?: boolean; reativados?: number; expirados?: number } = {}

export function CorrigirStatusCuponsButton() {
  const [state, formAction] = useFormState(corrigirStatusCupons, initialState)

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Corrigir status pela validade
      </button>
      {state.ok && (
        <span className="text-sm text-slate-500">
          {state.reativados} reativado(s) e {state.expirados} expirado(s) agora.
        </span>
      )}
      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
    </form>
  )
}
