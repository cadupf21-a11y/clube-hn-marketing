import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DisparoGrupoForm, type DisparoGrupoFormValues } from '../../../disparo-grupo-form'
import { atualizarDisparoGrupo } from '../../../actions'

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return ''
  const data = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`
}

export default async function EditarDisparoGrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: disparo } = await supabase.from('disparos').select('*').eq('id', id).maybeSingle()

  if (!disparo) {
    notFound()
  }

  if (disparo.status !== 'rascunho' && disparo.status !== 'agendado') {
    redirect('/admin/disparos?tab=grupo')
  }

  const defaultValues: DisparoGrupoFormValues = {
    titulo: disparo.titulo,
    mensagem: disparo.mensagem,
    agendado_para: toDatetimeLocalValue(disparo.agendado_para),
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/disparos?tab=grupo" className="text-sm text-slate-500 hover:underline">
          &larr; Disparos
        </Link>
        <h2 className="text-base font-medium text-slate-900">Editar campanha (Grupo)</h2>
      </div>
      <DisparoGrupoForm action={atualizarDisparoGrupo.bind(null, id)} defaultValues={defaultValues} />
    </div>
  )
}
