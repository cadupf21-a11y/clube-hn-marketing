'use client'

import { excluirAtendenteAdmin } from './actions'

export function ExcluirAtendenteButton({
  parceiroId,
  atendenteId,
  nome,
}: {
  parceiroId: string
  atendenteId: string
  nome: string
}) {
  return (
    <form
      action={excluirAtendenteAdmin.bind(null, parceiroId, atendenteId)}
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
