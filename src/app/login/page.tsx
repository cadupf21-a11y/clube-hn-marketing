import { LoginForm } from './login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const { redirect } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-appbg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-center text-2xl font-bold text-gradient-brand">Clube HN Marketing</h1>
        <p className="mb-6 text-center text-sm text-slate-500">
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
