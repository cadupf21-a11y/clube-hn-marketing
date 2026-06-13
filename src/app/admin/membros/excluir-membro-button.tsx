'use client'

import { excluirMembro } from './actions'

export function ExcluirMembroButton({ membroId, nome }: { membroId: string; nome: string }) {
  return (
    <form
      action={excluirMembro.bind(null, membroId)}
      onSubmit={(e) => {
        if (!confirm(`Excluir o cliente ${nome}? Esta acao nao pode ser desfeita.`)) {
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
