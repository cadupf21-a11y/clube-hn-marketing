'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { redefinirPinAtendenteAdmin } from './actions'

type FormState = { error?: string; ok?: boolean }

const initialState: FormState = { error: undefined, ok: undefined }

export function RedefinirPinAtendenteForm({ parceiroId, atendenteId }: { parceiroId: string; atendenteId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useFormState(redefinirPinAtendenteAdmin, initialState)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-slate-600 underline">
        Redefinir PIN
      </button>
    )
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="parceiro_id" value={parceiroId} />
      <input type="hidden" name="atendente_id" value={atendenteId} />
      <input
        name="pin"
        inputMode="numeric"
        pattern="[0-9]{4,6}"
        placeholder="Novo PIN"
        required
        className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none"
      />
      <button type="submit" className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-white hover:bg-primary-dark">
        Salvar
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-400">
        Cancelar
      </button>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  )
}
