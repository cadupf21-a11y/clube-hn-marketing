'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { emitirCupomManual } from '../actions'

const initialState = { error: undefined as string | undefined, ok: undefined as boolean | undefined, codigo: undefined as string | undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {pending ? 'Gerando...' : 'Gerar cupom'}
    </button>
  )
}

export function EmitirCupomForm({
  niveis,
  parceiros,
}: {
  niveis: { id: string; nome: string; pontos_necessarios: number }[]
  parceiros: { id: string; nome: string }[]
}) {
  const [state, formAction] = useFormState(emitirCupomManual, initialState)

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
      <div>
        <label htmlFor="telefone" className="block text-sm font-medium text-slate-700">Telefone do membro</label>
        <input
          id="telefone"
          name="telefone"
          required
          placeholder="Somente numeros, com DDI"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="cupom_nivel_id" className="block text-sm font-medium text-slate-700">Nivel de cupom</label>
        <select
          id="cupom_nivel_id"
          name="cupom_nivel_id"
          required
          defaultValue=""
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="" disabled>
            Selecione um nivel
          </option>
          {niveis.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nome} ({n.pontos_necessarios} pts)
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="parceiro_id" className="block text-sm font-medium text-slate-700">Parceiro do cupom</label>
        <select
          id="parceiro_id"
          name="parceiro_id"
          required
          defaultValue=""
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="" disabled>
            Selecione um parceiro
          </option>
          {parceiros.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2 flex items-center gap-3">
        <SubmitButton />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && (
          <p className="text-sm text-emerald-600">
            Cupom gerado com sucesso! Codigo: <span className="font-semibold">{state.codigo}</span>
          </p>
        )}
      </div>
    </form>
  )
}
