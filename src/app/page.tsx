import { redirect } from 'next/navigation'
import { getPerfilAtual } from '@/lib/auth/perfil'

export default async function Home() {
  const perfil = await getPerfilAtual()

  if (!perfil) redirect('/login')
  redirect(perfil.role === 'admin' ? '/admin' : '/parceiro')
}
