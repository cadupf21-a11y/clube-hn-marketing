'use client'

import { excluirCupom } from './actions'

export function ExcluirCupomButton({ cupomId, codigo }: { cupomId: string; codigo: string }) {
  return (
    <form
      action={excluirCupom.bind(null, cupomId)}
      onSubmit={(e) => {
        if (!confirm(`Excluir o cupom ${codigo}? Esta acao nao pode ser desfeita.`)) {
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
