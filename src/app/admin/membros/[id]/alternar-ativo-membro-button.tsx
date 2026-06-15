'use client'

import { useFormState } from 'react-dom'
import { alternarAtivoMembro } from './actions'

const initialState: { error?: string } = {}

export function AlternarAtivoMembroButton({ membroId, ativo }: { membroId: string; ativo: boolean }) {
  const [state, formAction] = useFormState(alternarAtivoMembro.bind(null, membroId, !ativo), initialState)

  return (
    <form action={formAction}>
      <button
        type="submit"
        className={`rounded-md px-3 py-1.5 text-sm font-medium ${
          ativo ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        }`}
      >
        {ativo ? 'Bloquear cliente' : 'Desbloquear cliente'}
      </button>
      {state.error && <p className="mt-1 text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
