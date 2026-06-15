'use client'

import { useFormState } from 'react-dom'
import { alternarAtivoPlano } from './actions'

const initialState: { error?: string } = {}

export function AlternarAtivoPlanoButton({ planoId, ativo }: { planoId: string; ativo: boolean }) {
  const [state, formAction] = useFormState(alternarAtivoPlano.bind(null, planoId, !ativo), initialState)

  return (
    <form action={formAction}>
      <button type="submit" className="text-sm text-slate-600 underline">
        {ativo ? 'Desativar' : 'Ativar'}
      </button>
      {state.error && <p className="mt-1 text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
