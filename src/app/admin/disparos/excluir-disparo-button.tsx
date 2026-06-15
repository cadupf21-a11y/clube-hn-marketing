'use client'

import { useFormState } from 'react-dom'
import { excluirDisparo } from './actions'

const initialState: { error?: string } = {}

export function ExcluirDisparoButton({ disparoId, titulo }: { disparoId: string; titulo: string }) {
  const [state, formAction] = useFormState(excluirDisparo.bind(null, disparoId), initialState)

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Excluir o disparo "${titulo}"? Esta acao nao pode ser desfeita.`)) {
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
