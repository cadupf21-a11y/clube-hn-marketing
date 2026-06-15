'use client'

import { useFormState } from 'react-dom'
import { excluirNivel } from './actions'

const initialState: { error?: string } = {}

export function ExcluirNivelButton({ nivelId, nome }: { nivelId: string; nome: string }) {
  const [state, formAction] = useFormState(excluirNivel.bind(null, nivelId), initialState)

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`Excluir o nivel ${nome}? Esta acao nao pode ser desfeita.`)) {
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
