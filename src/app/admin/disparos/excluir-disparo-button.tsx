'use client'

import { excluirDisparo } from './actions'

export function ExcluirDisparoButton({ disparoId, titulo }: { disparoId: string; titulo: string }) {
  return (
    <form
      action={excluirDisparo.bind(null, disparoId)}
      onSubmit={(e) => {
        if (!confirm(`Excluir o disparo "${titulo}"? Esta acao nao pode ser desfeita.`)) {
          e.preventDefault()
        }
      }}
    >
      <button type="submit" className="text-sm text-red-600 underline">
        Excluir
      </button>
    </form>
  )
}
