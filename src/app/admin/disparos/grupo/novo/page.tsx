import Link from 'next/link'
import { DisparoGrupoForm } from '../../disparo-grupo-form'
import { criarDisparoGrupo } from '../../actions'

export default function NovoDisparoGrupoPage() {
  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/disparos?tab=grupo" className="text-sm text-slate-500 hover:underline">
          &larr; Disparos
        </Link>
        <h2 className="text-base font-medium text-slate-900">Nova campanha (Grupo)</h2>
      </div>
      <DisparoGrupoForm action={criarDisparoGrupo} />
    </div>
  )
}
