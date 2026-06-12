'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { lancarPontos, type LancarPontosState, type LancarPontosSucesso } from './actions'

const initialState: LancarPontosState = { error: undefined, sucesso: undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {pending ? 'Lancando...' : 'Lancar pontos'}
    </button>
  )
}

export function LancarPontosForm({ taxaConversao }: { taxaConversao: number }) {
  const [state, formAction] = useFormState(lancarPontos, initialState)
  const [valor, setValor] = useState('')
  const [confirmacao, setConfirmacao] = useState<LancarPontosSucesso | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.sucesso) {
      setConfirmacao(state.sucesso)
    }
  }, [state.sucesso])

  const valorNumerico = Number(valor.replace(',', '.'))
  const pontosEstimados =
    valorNumerico > 0 && Number.isFinite(valorNumerico) ? Math.floor(valorNumerico * taxaConversao) : 0

  if (confirmacao) {
    return (
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <span className="text-2xl">✓</span>
        </div>
        <div>
          <p className="text-sm text-slate-500">Pontos registrados para</p>
          <p className="text-lg font-semibold text-slate-900">{confirmacao.membroNome}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Pontos ganhos</p>
            <p className="text-xl font-semibold text-green-600">+{confirmacao.pontosGanhos}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Saldo atual</p>
            <p className="text-xl font-semibold text-slate-900">{confirmacao.saldoAtual}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setConfirmacao(null)
            setValor('')
            formRef.current?.reset()
          }}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Nova venda
        </button>
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div>
        <label htmlFor="telefone" className="block text-sm font-medium text-slate-700">
          Telefone do membro
        </label>
        <input
          id="telefone"
          name="telefone"
          required
          placeholder="(11) 99999-9999"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-slate-700">
          Nome (apenas para novo cadastro)
        </label>
        <input
          id="nome"
          name="nome"
          placeholder="Nome do cliente"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="valor_compra" className="block text-sm font-medium text-slate-700">
          Valor da compra (R$)
        </label>
        <input
          id="valor_compra"
          name="valor_compra"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="rounded-md bg-slate-50 p-3 text-center">
        <p className="text-xs text-slate-500">Pontos a serem ganhos</p>
        <p className="text-2xl font-semibold text-slate-900">{pontosEstimados}</p>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <SubmitButton />
    </form>
  )
}
