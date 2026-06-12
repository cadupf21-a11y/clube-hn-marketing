'use client'

import { useState } from 'react'
import { exportarMembrosCsv } from './actions'

export function ExportarCsvButton() {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setErro(null)
    try {
      const csv = await exportarMembrosCsv()
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      setErro('Erro ao gerar o CSV.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
      >
        {loading ? 'Gerando...' : 'Exportar CSV'}
      </button>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  )
}
