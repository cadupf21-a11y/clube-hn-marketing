'use client'

import { useFormState } from 'react-dom'
import type { MensalidadeStatus } from '@/lib/types/database.types'
import { atualizarStatusMensalidade } from './actions'

const initialState: { error?: string } = {}

export function AtualizarStatusMensalidadeButton({
  mensalidadeId,
  novoStatus,
}: {
  mensalidadeId: string
  novoStatus: MensalidadeStatus
}) {
  const [state, formAction] = useFormState(
    atualizarStatusMensalidade.bind(null, mensalidadeId, novoStatus),
    initialState,
  )

  return (
    <form action={formAction}>
      <button type="submit" className="text-sm text-slate-600 underline">
        Marcar {novoStatus}
      </button>
      {state.error && <p className="mt-1 text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
