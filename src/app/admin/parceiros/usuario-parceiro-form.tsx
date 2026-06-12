'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { criarUsuarioParceiro, resetarSenhaUsuarioParceiro } from './actions'

type FormState = { error?: string; ok?: boolean }

const initialState: FormState = { error: undefined, ok: undefined }

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {pending ? 'Salvando...' : label}
    </button>
  )
}

export function UsuarioParceiroForm({
  parceiroId,
  usuario,
}: {
  parceiroId: string
  usuario: { id: string; email: string } | null
}) {
  const [criarState, criarAction] = useFormState(criarUsuarioParceiro, initialState)
  const [resetState, resetAction] = useFormState(resetarSenhaUsuarioParceiro, initialState)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-slate-900">Usuario do parceiro</h3>

      {usuario ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Usuario vinculado: <span className="font-medium text-slate-900">{usuario.email}</span>
          </p>
          <form action={resetAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="perfil_id" value={usuario.id} />
            <input type="hidden" name="parceiro_id" value={parceiroId} />
            <div>
              <label htmlFor="reset_senha" className="block text-sm font-medium text-slate-700">
                Nova senha
              </label>
              <input
                id="reset_senha"
                name="senha"
                type="password"
                required
                minLength={6}
                className="mt-1 w-56 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <SubmitButton label="Resetar senha" />
            {resetState?.error && <p className="text-sm text-red-600">{resetState.error}</p>}
            {resetState?.ok && <p className="text-sm text-emerald-600">Senha atualizada.</p>}
          </form>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">Este parceiro ainda nao possui um usuario de acesso.</p>
          <form action={criarAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="parceiro_id" value={parceiroId} />
            <div>
              <label htmlFor="novo_email" className="block text-sm font-medium text-slate-700">
                E-mail
              </label>
              <input
                id="novo_email"
                name="email"
                type="email"
                required
                className="mt-1 w-64 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="nova_senha" className="block text-sm font-medium text-slate-700">
                Senha
              </label>
              <input
                id="nova_senha"
                name="senha"
                type="password"
                required
                minLength={6}
                className="mt-1 w-56 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <SubmitButton label="Criar usuario" />
            {criarState?.error && <p className="text-sm text-red-600">{criarState.error}</p>}
            {criarState?.ok && <p className="text-sm text-emerald-600">Usuario criado.</p>}
          </form>
        </div>
      )}
    </div>
  )
}
