'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { ajustarPontos } from './actions'

const initialState = { error: undefined as string | undefined, ok: undefined as boolean | undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
    >
      {pending ? 'Aplicando...' : 'Aplicar ajuste'}
    </button>
  )
}

export function AjustarPontosForm({
  membroId,
  parceiros,
  parceiroPadraoId,
}: {
  membroId: string
  parceiros: { id: string; nome: string }[]
  parceiroPadraoId: string | null
}) {
  const [state, formAction] = useFormState(ajustarPontos, initialState)

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="membro_id" value={membroId} />

      <div>
        <label htmlFor="parceiro_id" className="block text-sm font-medium text-slate-700">Parceiro responsavel</label>
        <select
          id="parceiro_id"
          name="parceiro_id"
          required
          defaultValue={parceiroPadraoId ?? ''}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
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

      <div>
        <label htmlFor="pontos" className="block text-sm font-medium text-slate-700">Pontos (use negativo para remover)</label>
        <input
          id="pontos"
          name="pontos"
          type="number"
          required
          className="mt-1 w-40 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="flex-1 min-w-[200px]">
        <label htmlFor="descricao" className="block text-sm font-medium text-slate-700">Descricao (opcional)</label>
        <input
          id="descricao"
          name="descricao"
          placeholder="Motivo do ajuste"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <SubmitButton />
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="w-full text-sm text-emerald-600">Ajuste aplicado com sucesso.</p>}
    </form>
  )
}
