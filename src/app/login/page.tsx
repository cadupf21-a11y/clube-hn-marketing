import { LoginForm } from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Clube HN Marketing</h1>
        <p className="mb-6 text-sm text-slate-500">
          Acesso para administradores HN e parceiros.
        </p>
        {redirect?.startsWith('/atendente') || redirect?.startsWith('/pdv') ? (
          <p className="mb-4 text-sm text-slate-600">
            Faca login com a conta do estabelecimento para liberar o PDV neste dispositivo.
          </p>
        ) : null}
        <LoginForm redirect={redirect} />
        <p className="mt-6 text-center text-xs text-slate-400">
          Atendente? Peca para o responsavel pelo estabelecimento fazer login e liberar o PIN em{' '}
          <span className="font-medium">/atendente</span>.
        </p>
      </div>
    </main>
  )
}
