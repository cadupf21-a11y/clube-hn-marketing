'use client'

import { useFormState, useFormStatus } from 'react-dom'

const initialState = { error: undefined as string | undefined }

function SubmitButton({ acao, label }: { acao: string; label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      name="acao"
      value={acao}
      disabled={pending}
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
    >
      {pending ? 'Enviando...' : label}
    </button>
  )
}

export type DisparoGrupoFormValues = {
  titulo?: string
  mensagem?: string
  agendado_para?: string
}

export function DisparoGrupoForm({
  action,
  defaultValues,
}: {
  action: (state: { error?: string }, formData: FormData) => Promise<{ error?: string }>
  defaultValues?: DisparoGrupoFormValues
}) {
  const [state, formAction] = useFormState(action, initialState)

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="titulo" className="block text-sm font-medium text-slate-700">Titulo da campanha</label>
        <input
          id="titulo"
          name="titulo"
          required
          defaultValue={defaultValues?.titulo}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="mensagem" className="block text-sm font-medium text-slate-700">Mensagem (WhatsApp)</label>
        <textarea
          id="mensagem"
          name="mensagem"
          required
          rows={4}
          defaultValue={defaultValues?.mensagem}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="agendado_para" className="block text-sm font-medium text-slate-700">
          Agendar para (opcional)
        </label>
        <input
          id="agendado_para"
          name="agendado_para"
          type="datetime-local"
          defaultValue={defaultValues?.agendado_para}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <SubmitButton acao="rascunho" label="Salvar rascunho" />
        <SubmitButton acao="agendar" label="Agendar envio" />
        <SubmitButton acao="enviar_agora" label="Enviar agora" />
        {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  )
}
