import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPerfilAtual } from '@/lib/auth/perfil'

export default async function Home() {
  const perfil = await getPerfilAtual()

  if (perfil) {
    redirect(perfil.role === 'admin' ? '/admin' : '/parceiro')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-appbg px-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <h1 className="text-2xl font-bold text-gradient-brand">Clube HN Marketing</h1>
        <div className="space-y-2 pt-2">
          <Link
            href="/login"
            className="block rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark"
          >
            Entrar
          </Link>
          <Link
            href="/consulta"
            className="block rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Consultar meu saldo
          </Link>
        </div>
      </div>
    </main>
  )
}
