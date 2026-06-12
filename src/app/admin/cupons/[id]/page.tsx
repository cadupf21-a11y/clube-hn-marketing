import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'

type CupomDetalhe = Database['public']['Tables']['cupons']['Row'] & {
  membros: { nome: string; telefone: string; email: string | null } | null
  parceiros: { nome: string } | null
  cupom_niveis: {
    nome: string
    descricao: string | null
    tipo_beneficio: string
    valor_beneficio: number | null
    pontos_necessarios: number
  } | null
  atendentes: { nome: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  disponivel: 'Disponivel',
  resgatado: 'Resgatado',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
}

function formatarData(data: string | null) {
  if (!data) return '-'
  return new Date(data).toLocaleString('pt-BR')
}

export default async function AdminCupomDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cupom } = await supabase
    .from('cupons')
    .select(
      '*, membros(nome, telefone, email), parceiros(nome), cupom_niveis(nome, descricao, tipo_beneficio, valor_beneficio, pontos_necessarios), atendentes:resgatado_por(nome)'
    )
    .eq('id', id)
    .maybeSingle()
    .returns<CupomDetalhe>()

  if (!cupom) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/cupons" className="text-sm text-slate-500 hover:underline">
          &larr; Cupons
        </Link>
        <h2 className="text-base font-medium text-slate-900">Cupom {cupom.codigo}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-slate-900">Cupom</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Codigo</dt>
              <dd className="font-medium text-slate-900">{cupom.codigo}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium text-slate-900">{STATUS_LABEL[cupom.status] ?? cupom.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Pontos utilizados</dt>
              <dd className="font-medium text-slate-900">{cupom.pontos_utilizados}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Emissao</dt>
              <dd className="font-medium text-slate-900">{formatarData(cupom.data_emissao)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Validade</dt>
              <dd className="font-medium text-slate-900">{formatarData(cupom.data_validade)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Resgatado em</dt>
              <dd className="font-medium text-slate-900">{formatarData(cupom.data_resgate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Atendente do resgate</dt>
              <dd className="font-medium text-slate-900">{cupom.atendentes?.nome ?? '-'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-slate-900">Cliente e parceiro</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Cliente</dt>
              <dd className="font-medium text-slate-900">{cupom.membros?.nome ?? '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Telefone</dt>
              <dd className="font-medium text-slate-900">{cupom.membros?.telefone ?? '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{cupom.membros?.email ?? '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Parceiro</dt>
              <dd className="font-medium text-slate-900">{cupom.parceiros?.nome ?? 'Clube HN'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
          <h3 className="mb-3 text-sm font-medium text-slate-900">Beneficio</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Nivel</dt>
              <dd className="font-medium text-slate-900">{cupom.cupom_niveis?.nome ?? '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Descricao</dt>
              <dd className="font-medium text-slate-900">{cupom.cupom_niveis?.descricao ?? '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Tipo de beneficio</dt>
              <dd className="font-medium text-slate-900">{cupom.cupom_niveis?.tipo_beneficio ?? '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Valor do beneficio</dt>
              <dd className="font-medium text-slate-900">{cupom.cupom_niveis?.valor_beneficio ?? '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Pontos necessarios</dt>
              <dd className="font-medium text-slate-900">{cupom.cupom_niveis?.pontos_necessarios ?? '-'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
