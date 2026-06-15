'use client'

import { useFormState } from 'react-dom'
import { cancelarDisparo } from './actions'

const initialState: { error?: string } = {}

export function CancelarDisparoButton({ disparoId }: { disparoId: string }) {
  const [state, formAction] = useFormState(cancelarDisparo.bind(null, disparoId), initialState)

  return (
    <form action={formAction}>
      <button type="submit" className="text-sm text-red-600 underline">
        Cancelar
      </button>
      {state.error && <p className="mt-1 text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
