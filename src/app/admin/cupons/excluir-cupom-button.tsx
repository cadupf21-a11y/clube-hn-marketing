'use client'

import { useFormState } from 'react-dom'
import { excluirCupom } from './actions'

const initialState: { error?: string } = {}

export function ExcluirCupomButton({ cupomId, codigo }: { cupomId: string; codigo: string }) {
  const [state, formAction] = useFormState(excluirCupom.bind(null, cupomId), initialState)

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Excluir o cupom ${codigo}? Esta acao nao pode ser desfeita.`)) {
          e.preventDefault()
        }
      }}
    >
      <button type="submit" className="text-sm text-red-600 underline">
        Excluir
      </button>
      {state.error && <p className="mt-1 text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
