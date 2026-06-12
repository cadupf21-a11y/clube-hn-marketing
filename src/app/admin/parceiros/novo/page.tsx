import Link from 'next/link'
import { ParceiroForm } from '../parceiro-form'
import { criarParceiro } from '../actions'

export default function NovoParceiroPage() {
  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/parceiros" className="text-sm text-slate-500 hover:underline">
          &larr; Parceiros
        </Link>
        <h2 className="text-base font-medium text-slate-900">Novo parceiro</h2>
      </div>
      <ParceiroForm action={criarParceiro} submitLabel="Criar parceiro" />
    </div>
  )
}
