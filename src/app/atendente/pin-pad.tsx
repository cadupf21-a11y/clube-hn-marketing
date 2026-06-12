'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { identificarAtendente } from './actions'

const initialState = { error: undefined as string | undefined }

function ConfirmButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
    >
      {pending ? 'Verificando...' : 'Entrar'}
    </button>
  )
}

export function PinPad({ atendentes }: { atendentes: { id: string; nome: string }[] }) {
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [state, formAction] = useFormState(identificarAtendente, initialState)

  if (!selecionado) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {atendentes.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelecionado(a.id)}
            className="rounded-xl border border-slate-200 bg-white p-4 text-center font-medium text-slate-700 shadow-sm transition-colors hover:border-primary hover:text-primary hover:shadow-md"
          >
            {a.nome}
          </button>
        ))}
        {atendentes.length === 0 && (
          <p className="col-span-full text-sm text-slate-500">
            Nenhum atendente ativo. Cadastre atendentes em Parceiro &gt; Atendentes.
          </p>
        )}
      </div>
    )
  }

  const nome = atendentes.find((a) => a.id === selecionado)?.nome

  return (
    <form action={formAction} className="mx-auto max-w-xs space-y-4">
      <input type="hidden" name="atendente_id" value={selecionado} />
      <input type="hidden" name="pin" value={pin} />

      <div className="text-center">
        <p className="text-sm text-slate-500">Atendente</p>
        <p className="text-lg font-semibold text-slate-900">{nome}</p>
        <button
          type="button"
          onClick={() => {
            setSelecionado(null)
            setPin('')
          }}
          className="mt-1 text-xs text-slate-400 underline"
        >
          Trocar
        </button>
      </div>

      <div className="flex justify-center gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-full border ${i < pin.length ? 'border-primary bg-primary' : 'border-slate-300'}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'limpar', '0', 'apagar'].map((key) => {
          if (key === 'limpar') {
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPin('')}
                className="rounded-xl border border-slate-200 bg-white py-4 text-sm font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-100"
              >
                Limpar
              </button>
            )
          }
          if (key === 'apagar') {
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPin((p) => p.slice(0, -1))}
                className="rounded-xl border border-slate-200 bg-white py-4 text-sm font-medium text-slate-500 shadow-sm transition-colors hover:bg-slate-100"
              >
                Apagar
              </button>
            )
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPin((p) => (p.length < 6 ? p + key : p))}
              className="rounded-xl border border-slate-200 bg-white py-4 text-lg font-semibold text-ink shadow-sm transition-colors hover:border-primary hover:bg-primary-light hover:text-primary active:bg-primary active:text-white"
            >
              {key}
            </button>
          )
        })}
      </div>

      {state?.error && <p className="text-center text-sm text-red-600">{state.error}</p>}

      <ConfirmButton />
    </form>
  )
}
