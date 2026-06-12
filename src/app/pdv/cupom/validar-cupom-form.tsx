'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import {
  buscarCupom,
  confirmarResgate,
  type BuscarCupomState,
  type ConfirmarResgateSucesso,
  type ConfirmarResgateState,
  type CupomPreview,
} from './actions'

const buscaInicial: BuscarCupomState = { error: undefined, cupom: undefined }
const confirmacaoInicial: ConfirmarResgateState = { error: undefined, sucesso: undefined }

const statusLabel: Record<string, string> = {
  disponivel: 'Disponivel',
  resgatado: 'Ja resgatado',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
}

function formatarBeneficio(cupom: CupomPreview) {
  switch (cupom.tipoBeneficio) {
    case 'desconto_percentual':
      return `${cupom.valorBeneficio ?? 0}% de desconto`
    case 'desconto_valor':
      return `R$ ${(cupom.valorBeneficio ?? 0).toFixed(2)} de desconto`
    case 'produto_gratis':
      return 'Produto gratis'
    default:
      return cupom.descricao ?? 'Beneficio'
  }
}

function formatarData(data: string) {
  return new Date(data).toLocaleDateString('pt-BR')
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function calcularDesconto(cupom: CupomPreview, valorCompra: number) {
  if (!Number.isFinite(valorCompra) || valorCompra < 0) return 0
  switch (cupom.tipoBeneficio) {
    case 'desconto_percentual':
      return Math.round(valorCompra * (cupom.valorBeneficio ?? 0)) / 100
    case 'desconto_valor':
      return cupom.valorBeneficio ?? 0
    default:
      return 0
  }
}

function BuscarButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
    >
      {pending ? 'Buscando...' : 'Buscar cupom'}
    </button>
  )
}

function ConfirmarButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
    >
      {pending ? 'Validando...' : 'Confirmar resgate'}
    </button>
  )
}

export function ValidarCupomForm() {
  const [buscaState, buscarAction] = useFormState(buscarCupom, buscaInicial)
  const [confirmState, confirmarAction] = useFormState(confirmarResgate, confirmacaoInicial)

  const [cupom, setCupom] = useState<CupomPreview | null>(null)
  const [confirmacao, setConfirmacao] = useState<ConfirmarResgateSucesso | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [valorCompra, setValorCompra] = useState('')

  useEffect(() => {
    if (buscaState.cupom) {
      setCupom(buscaState.cupom)
    }
  }, [buscaState.cupom])

  useEffect(() => {
    if (confirmState.sucesso) {
      setConfirmacao(confirmState.sucesso)
    }
  }, [confirmState.sucesso])

  function reiniciar() {
    setCupom(null)
    setConfirmacao(null)
    setValorCompra('')
    setFormKey((k) => k + 1)
  }

  if (confirmacao) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <span className="text-2xl">✓</span>
        </div>
        <div>
          <p className="text-sm text-slate-500">Cupom validado para</p>
          <p className="text-lg font-semibold text-slate-900">{confirmacao.membroNome}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Beneficio</p>
            <p className="text-sm font-semibold text-slate-900">{confirmacao.nivelNome}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Saldo atual</p>
            <p className="text-xl font-semibold text-slate-900">{confirmacao.saldoAtual}</p>
          </div>
        </div>
        {confirmacao.valorDesconto > 0 && (
          <div className="rounded-md bg-green-50 p-3">
            <p className="text-xs text-slate-500">Desconto concedido</p>
            <p className="text-xl font-semibold text-green-600">{formatarMoeda(confirmacao.valorDesconto)}</p>
          </div>
        )}
        <p className="text-xs text-slate-400">
          {confirmacao.pontosUtilizados} pontos utilizados neste resgate
        </p>
        <button
          type="button"
          onClick={reiniciar}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Validar outro cupom
        </button>
      </div>
    )
  }

  if (cupom) {
    const podeResgatar = cupom.status === 'disponivel'

    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs text-slate-500">Codigo</p>
          <p className="text-lg font-semibold text-slate-900">{cupom.codigo}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Cliente</p>
            <p className="text-sm font-semibold text-slate-900">{cupom.membroNome}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Status</p>
            <p
              className={`text-sm font-semibold ${
                podeResgatar ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {statusLabel[cupom.status] ?? cupom.status}
            </p>
          </div>
        </div>

        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Beneficio</p>
          <p className="text-sm font-semibold text-slate-900">{cupom.nivelNome}</p>
          <p className="text-sm text-slate-600">{formatarBeneficio(cupom)}</p>
        </div>

        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Validade</p>
          <p className="text-sm font-semibold text-slate-900">{formatarData(cupom.dataValidade)}</p>
        </div>

        {confirmState?.error && <p className="text-sm text-red-600">{confirmState.error}</p>}

        {podeResgatar ? (
          <form action={confirmarAction} className="space-y-2">
            <input type="hidden" name="cupom_id" value={cupom.id} />

            <div>
              <label htmlFor="valor_compra" className="block text-sm font-medium text-slate-700">
                Valor da compra (R$)
              </label>
              <input
                id="valor_compra"
                name="valor_compra"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={valorCompra}
                onChange={(e) => setValorCompra(e.target.value)}
                placeholder="0,00"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {(cupom.tipoBeneficio === 'desconto_percentual' || cupom.tipoBeneficio === 'desconto_valor') && (
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Desconto calculado</p>
                <p className="text-lg font-semibold text-slate-900">
                  {formatarMoeda(calcularDesconto(cupom, Number(valorCompra.replace(',', '.')) || 0))}
                </p>
              </div>
            )}

            <ConfirmarButton />
          </form>
        ) : (
          <p className="text-center text-sm text-slate-500">Este cupom nao pode ser resgatado.</p>
        )}

        <button
          type="button"
          onClick={reiniciar}
          className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Buscar outro cupom
        </button>
      </div>
    )
  }

  return (
    <form
      key={formKey}
      action={buscarAction}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div>
        <label htmlFor="codigo" className="block text-sm font-medium text-slate-700">
          Codigo do cupom
        </label>
        <input
          id="codigo"
          name="codigo"
          required
          autoCapitalize="characters"
          placeholder="EX: ABC123"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase shadow-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      {buscaState?.error && <p className="text-sm text-red-600">{buscaState.error}</p>}

      <BuscarButton />
    </form>
  )
}
