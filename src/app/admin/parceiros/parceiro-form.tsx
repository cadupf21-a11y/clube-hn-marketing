'use client'

import { useFormState, useFormStatus } from 'react-dom'
import type { Database } from '@/lib/types/database.types'

type Parceiro = Database['public']['Tables']['parceiros']['Row']
type FormState = { error?: string; ok?: boolean }

const initialState: FormState = { error: undefined, ok: undefined }

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

export function ParceiroForm({
  parceiro,
  action,
  submitLabel,
}: {
  parceiro?: Parceiro
  action: (prevState: FormState, formData: FormData) => Promise<FormState>
  submitLabel: string
}) {
  const [state, formAction] = useFormState(action, initialState)

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
      {parceiro && <input type="hidden" name="id" value={parceiro.id} />}

      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome</label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={parceiro?.nome ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="razao_social" className="block text-sm font-medium text-slate-700">Razao social</label>
        <input
          id="razao_social"
          name="razao_social"
          defaultValue={parceiro?.razao_social ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="cnpj" className="block text-sm font-medium text-slate-700">CNPJ</label>
        <input
          id="cnpj"
          name="cnpj"
          defaultValue={parceiro?.cnpj ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="categoria" className="block text-sm font-medium text-slate-700">Categoria</label>
        <input
          id="categoria"
          name="categoria"
          defaultValue={parceiro?.categoria ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="telefone" className="block text-sm font-medium text-slate-700">Telefone</label>
        <input
          id="telefone"
          name="telefone"
          defaultValue={parceiro?.telefone ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="whatsapp" className="block text-sm font-medium text-slate-700">WhatsApp</label>
        <input
          id="whatsapp"
          name="whatsapp"
          placeholder="Somente numeros, com DDI"
          defaultValue={parceiro?.whatsapp ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={parceiro?.email ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="endereco" className="block text-sm font-medium text-slate-700">Endereco</label>
        <input
          id="endereco"
          name="endereco"
          defaultValue={parceiro?.endereco ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label htmlFor="cidade" className="block text-sm font-medium text-slate-700">Cidade</label>
          <input
            id="cidade"
            name="cidade"
            defaultValue={parceiro?.cidade ?? ''}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="estado" className="block text-sm font-medium text-slate-700">UF</label>
          <input
            id="estado"
            name="estado"
            maxLength={2}
            defaultValue={parceiro?.estado ?? ''}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="taxa_conversao_pontos" className="block text-sm font-medium text-slate-700">
          Taxa de conversao (pontos por R$1)
        </label>
        <input
          id="taxa_conversao_pontos"
          name="taxa_conversao_pontos"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={parceiro?.taxa_conversao_pontos ?? 1}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="teto_pontos_mensal" className="block text-sm font-medium text-slate-700">
          Teto de pontos por mes (opcional)
        </label>
        <input
          id="teto_pontos_mensal"
          name="teto_pontos_mensal"
          type="number"
          min="0"
          defaultValue={parceiro?.teto_pontos_mensal ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="logo_url" className="block text-sm font-medium text-slate-700">URL do logo</label>
        <input
          id="logo_url"
          name="logo_url"
          type="url"
          placeholder="https://..."
          defaultValue={parceiro?.logo_url ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="cor_destaque" className="block text-sm font-medium text-slate-700">Cor de destaque</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            id="cor_destaque"
            name="cor_destaque"
            type="color"
            defaultValue={parceiro?.cor_destaque || '#0f172a'}
            className="h-9 w-12 rounded-md border border-slate-300 p-1"
          />
          <span className="text-xs text-slate-400">Usada para personalizar telas do parceiro.</span>
        </div>
      </div>

      <div className="sm:col-span-2 flex items-center gap-2">
        <input
          id="ativo"
          name="ativo"
          type="checkbox"
          defaultChecked={parceiro ? parceiro.ativo : true}
          className="h-4 w-4 rounded border-slate-300"
        />
        <label htmlFor="ativo" className="text-sm font-medium text-slate-700">Parceiro ativo</label>
      </div>

      <div className="sm:col-span-2 flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-emerald-600">Dados salvos.</p>}
      </div>
    </form>
  )
}
