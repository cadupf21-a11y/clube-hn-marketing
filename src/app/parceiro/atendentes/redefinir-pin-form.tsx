'use client'

import { useState } from 'react'
import { redefinirPin } from './actions'

export function RedefinirPinForm({ atendenteId }: { atendenteId: string }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-slate-600 underline">
        Redefinir PIN
      </button>
    )
  }

  return (
    <form
      action={async (formData) => {
        await redefinirPin(formData)
        setOpen(false)
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="atendente_id" value={atendenteId} />
      <input
        name="pin"
        inputMode="numeric"
        pattern="[0-9]{4,6}"
        placeholder="Novo PIN"
        required
        className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
      />
      <button type="submit" className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800">
        Salvar
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-400">
        Cancelar
      </button>
    </form>
  )
}
