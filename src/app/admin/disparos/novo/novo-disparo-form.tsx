'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { criarDisparo } from '../actions'

const initialState = { error: undefined as string | undefined }

const TIPOS_SEGMENTACAO = [
  { value: 'todos', label: 'Todos os membros' },
  { value: 'parceiro', label: 'Por parceiro especifico' },
  { value: 'inativos', label: 'Inativos ha X dias' },
  { value: 'aniversariantes', label: 'Aniversariantes do mes' },
  { value: 'saldo_minimo', label: 'Saldo minimo de pontos' },
  { value: 'nunca_resgataram', label: 'Nunca resgataram cupom' },
] as const

function SubmitButton({ acao, label }: { acao: string; label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      name="acao"
      value={acao}
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {pending ? 'Enviando...' : label}
    </button>
  )
}

export function NovoDisparoForm({ parceiros }: { parceiros: { id: string; nome: string }[] }) {
  const [state, formAction] = useFormState(criarDisparo, initialState)
  const [tipoSegmentacao, setTipoSegmentacao] = useState<string>('todos')

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="titulo" className="block text-sm font-medium text-slate-700">Titulo da campanha</label>
        <input
          id="titulo"
          name="titulo"
          required
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
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <fieldset className="sm:col-span-2 rounded-md border border-slate-200 p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">Segmentacao</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="tipo_segmentacao" className="block text-sm font-medium text-slate-700">
              Tipo de segmentacao
            </label>
            <select
              id="tipo_segmentacao"
              name="tipo_segmentacao"
              value={tipoSegmentacao}
              onChange={(e) => setTipoSegmentacao(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
            >
              {TIPOS_SEGMENTACAO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {tipoSegmentacao === 'parceiro' && (
            <div>
              <label htmlFor="parceiro_id" className="block text-sm font-medium text-slate-700">Parceiro</label>
              <select
                id="parceiro_id"
                name="parceiro_id"
                defaultValue=""
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="">Selecione...</option>
                {parceiros.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tipoSegmentacao === 'inativos' && (
            <div>
              <label htmlFor="dias_inativos" className="block text-sm font-medium text-slate-700">
                Inativos ha quantos dias
              </label>
              <input
                id="dias_inativos"
                name="dias_inativos"
                type="number"
                min="1"
                defaultValue={30}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}

          {tipoSegmentacao === 'saldo_minimo' && (
            <div>
              <label htmlFor="saldo_minimo" className="block text-sm font-medium text-slate-700">
                Saldo minimo de pontos
              </label>
              <input
                id="saldo_minimo"
                name="saldo_minimo"
                type="number"
                min="0"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
          )}
        </div>
      </fieldset>

      <div>
        <label htmlFor="agendado_para" className="block text-sm font-medium text-slate-700">
          Agendar para (opcional)
        </label>
        <input
          id="agendado_para"
          name="agendado_para"
          type="datetime-local"
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
