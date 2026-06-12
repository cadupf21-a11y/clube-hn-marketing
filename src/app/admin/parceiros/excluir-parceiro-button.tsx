'use client'

import { useState } from 'react'
import { excluirParceiro } from './actions'

export function ExcluirParceiroButton({ parceiroId, nome }: { parceiroId: string; nome: string }) {
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!confirm(`Excluir o parceiro ${nome}? Esta acao nao pode ser desfeita.`)) {
      return
    }

    setLoading(true)
    setErro(null)
    const result = await excluirParceiro(parceiroId)
    setLoading(false)

    if (result?.error) {
      setErro(result.error)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-sm text-red-600 underline disabled:opacity-60"
      >
        Excluir
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </div>
  )
}
