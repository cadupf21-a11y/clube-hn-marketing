'use client'

import { useState } from 'react'
import { excluirAtendente } from './actions'

export function ExcluirAtendenteButton({ atendenteId, nome }: { atendenteId: string; nome: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-red-600 underline">
        Excluir
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <p className="text-sm text-slate-700">
              Tem certeza que deseja excluir o atendente <strong>{nome}</strong>? Esta acao nao pode ser desfeita.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <form action={excluirAtendente.bind(null, atendenteId)}>
                <button
                  type="submit"
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                >
                  Excluir
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
