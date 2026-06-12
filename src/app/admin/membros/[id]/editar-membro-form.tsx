'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { atualizarMembro } from './actions'
import type { Database } from '@/lib/types/database.types'

type Membro = Database['public']['Tables']['membros']['Row']

const initialState = { error: undefined as string | undefined, ok: undefined as boolean | undefined }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
    >
      {pending ? 'Salvando...' : 'Salvar alteracoes'}
    </button>
  )
}

export function EditarMembroForm({ membro }: { membro: Membro }) {
  const [state, formAction] = useFormState(atualizarMembro, initialState)

  const diaNascimento = membro.data_nascimento ? Number(membro.data_nascimento.slice(8, 10)) : ''
  const mesNascimento = membro.data_nascimento ? Number(membro.data_nascimento.slice(5, 7)) : ''

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
      <input type="hidden" name="id" value={membro.id} />

      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome</label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={membro.nome}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="telefone" className="block text-sm font-medium text-slate-700">Telefone</label>
        <input
          id="telefone"
          name="telefone"
          required
          defaultValue={membro.telefone}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={membro.email ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="cpf" className="block text-sm font-medium text-slate-700">CPF</label>
        <input
          id="cpf"
          name="cpf"
          defaultValue={membro.cpf ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Data de nascimento (dia/mes)</label>
        <div className="mt-1 flex gap-2">
          <input
            id="dia_nascimento"
            name="dia_nascimento"
            type="number"
            min="1"
            max="31"
            placeholder="Dia"
            defaultValue={diaNascimento}
            className="w-1/2 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
          <input
            id="mes_nascimento"
            name="mes_nascimento"
            type="number"
            min="1"
            max="12"
            placeholder="Mes"
            defaultValue={mesNascimento}
            className="w-1/2 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="sm:col-span-2 flex items-center gap-3">
        <SubmitButton />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-emerald-600">Dados atualizados.</p>}
      </div>
    </form>
  )
}
