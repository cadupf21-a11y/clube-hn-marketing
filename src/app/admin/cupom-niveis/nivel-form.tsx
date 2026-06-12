'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { criarNivel, atualizarNivel } from './actions'
import type { Database } from '@/lib/types/database.types'

type CupomNivel = Database['public']['Tables']['cupom_niveis']['Row']

const initialState = { error: undefined as string | undefined }

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
    >
      {pending ? 'Salvando...' : label}
    </button>
  )
}

export function NivelForm({
  nivel,
  parceiros,
  parceiroIdsSelecionados,
}: {
  nivel?: CupomNivel
  parceiros: { id: string; nome: string }[]
  parceiroIdsSelecionados: string[]
}) {
  const action = nivel ? atualizarNivel : criarNivel
  const [state, formAction] = useFormState(action, initialState)

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
      {nivel && <input type="hidden" name="id" value={nivel.id} />}

      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome</label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={nivel?.nome ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="pontos_necessarios" className="block text-sm font-medium text-slate-700">Pontos necessarios</label>
        <input
          id="pontos_necessarios"
          name="pontos_necessarios"
          type="number"
          min="1"
          required
          defaultValue={nivel?.pontos_necessarios ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="descricao" className="block text-sm font-medium text-slate-700">Descricao</label>
        <input
          id="descricao"
          name="descricao"
          defaultValue={nivel?.descricao ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="tipo_beneficio" className="block text-sm font-medium text-slate-700">Tipo de beneficio</label>
        <select
          id="tipo_beneficio"
          name="tipo_beneficio"
          required
          defaultValue={nivel?.tipo_beneficio ?? 'desconto_percentual'}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="desconto_percentual">Desconto percentual</option>
          <option value="desconto_valor">Desconto em valor (R$)</option>
          <option value="produto_gratis">Produto gratis</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      <div>
        <label htmlFor="valor_beneficio" className="block text-sm font-medium text-slate-700">
          Valor do beneficio (% ou R$)
        </label>
        <input
          id="valor_beneficio"
          name="valor_beneficio"
          type="number"
          step="0.01"
          min="0"
          defaultValue={nivel?.valor_beneficio ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="validade_dias" className="block text-sm font-medium text-slate-700">Validade (dias)</label>
        <input
          id="validade_dias"
          name="validade_dias"
          type="number"
          min="1"
          defaultValue={nivel?.validade_dias ?? 30}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="ativo"
          name="ativo"
          type="checkbox"
          defaultChecked={nivel?.ativo ?? true}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="ativo" className="text-sm font-medium text-slate-700">Nivel ativo</label>
      </div>

      <div className="sm:col-span-2">
        <p className="block text-sm font-medium text-slate-700">Parceiros que aceitam este nivel</p>
        <p className="mb-2 text-xs text-slate-500">
          Se nenhum parceiro for marcado, o nivel fica disponivel para todos os parceiros.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {parceiros.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="parceiro_ids"
                value={p.id}
                defaultChecked={parceiroIdsSelecionados.includes(p.id)}
                className="h-4 w-4 rounded border-slate-300"
              />
              {p.nome}
            </label>
          ))}
        </div>
      </div>

      <div className="sm:col-span-2 flex items-center gap-3">
        <SubmitButton label={nivel ? 'Salvar alteracoes' : 'Criar nivel'} />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  )
}
