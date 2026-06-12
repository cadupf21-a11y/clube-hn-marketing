import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DisparoForm, type DisparoFormValues } from '../../disparo-form'
import { atualizarDisparo } from '../../actions'

type Segmento = {
  tipo?: 'todos' | 'parceiro' | 'inativos' | 'aniversariantes' | 'saldo_minimo' | 'nunca_resgataram'
  parceiro_id?: string
  dias_inativos?: number
  saldo_minimo?: number
}

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return ''
  const data = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`
}

export default async function EditarDisparoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: disparo } = await supabase.from('disparos').select('*').eq('id', id).maybeSingle()

  if (!disparo) {
    notFound()
  }

  if (disparo.status !== 'rascunho' && disparo.status !== 'agendado') {
    redirect('/admin/disparos')
  }

  const { data: parceiros } = await supabase.from('parceiros').select('id, nome').eq('ativo', true).order('nome')

  const segmento = (disparo.segmento ?? {}) as Segmento

  const defaultValues: DisparoFormValues = {
    titulo: disparo.titulo,
    mensagem: disparo.mensagem,
    tipo_segmentacao: segmento.tipo ?? 'todos',
    parceiro_id: segmento.parceiro_id,
    dias_inativos: segmento.dias_inativos,
    saldo_minimo: segmento.saldo_minimo,
    agendado_para: toDatetimeLocalValue(disparo.agendado_para),
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/disparos" className="text-sm text-slate-500 hover:underline">
          &larr; Disparos
        </Link>
        <h2 className="text-base font-medium text-slate-900">Editar campanha</h2>
      </div>
      <DisparoForm parceiros={parceiros ?? []} action={atualizarDisparo.bind(null, id)} defaultValues={defaultValues} />
    </div>
  )
}
