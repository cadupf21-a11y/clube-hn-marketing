'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { consultarSaldo, type ConsultaResultado, type ConsultaState } from './actions'

const initialState: ConsultaState = {}

const NIVEL_LABEL: Record<string, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
}

function formatarData(data: string) {
  return new Date(data).toLocaleDateString('pt-BR')
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-60"
    >
      {pending ? 'Consultando...' : 'Consultar'}
    </button>
  )
}

export function ConsultaForm() {
  const [state, formAction] = useFormState(consultarSaldo, initialState)
  const [resultado, setResultado] = useState<ConsultaResultado | null>(null)
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    if (state.resultado) {
      setResultado(state.resultado)
    }
  }, [state.resultado])

  function reiniciar() {
    setResultado(null)
    setFormKey((k) => k + 1)
  }

  if (resultado) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs text-slate-500">Cliente</p>
          <p className="text-lg font-semibold text-slate-900">{resultado.nome}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Saldo de pontos</p>
            <p className="text-xl font-semibold text-slate-900">{resultado.pontos_saldo}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Nivel atual</p>
            <p className="text-xl font-semibold text-slate-900">
              {NIVEL_LABEL[resultado.nivel] ?? resultado.nivel}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs text-slate-500">Cupons disponiveis</p>
          {resultado.cupons.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum cupom disponivel no momento.</p>
          ) : (
            <ul className="space-y-2">
              {resultado.cupons.map((cupom) => (
                <li key={cupom.codigo} className="rounded-md bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">{cupom.codigo}</p>
                  <p className="text-sm text-slate-600">{cupom.nivel_nome}</p>
                  <p className="text-xs text-slate-400">Valido até {formatarData(cupom.data_validade)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={reiniciar}
          className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Consultar outro telefone
        </button>
      </div>
    )
  }

  return (
    <form
      key={formKey}
      action={formAction}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div>
        <label htmlFor="telefone" className="block text-sm font-medium text-slate-700">
          Telefone (com DDD)
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="numeric"
          required
          placeholder="11999999999"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  )
}
