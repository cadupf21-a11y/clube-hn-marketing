'use client'

import { excluirAtendente } from './actions'

export function ExcluirAtendenteButton({ atendenteId, nome }: { atendenteId: string; nome: string }) {
  return (
    <form
      action={excluirAtendente.bind(null, atendenteId)}
      onSubmit={(e) => {
        if (!confirm(`Excluir o atendente ${nome}? Esta acao nao pode ser desfeita.`)) {
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
