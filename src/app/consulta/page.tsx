import Link from 'next/link'
import { ConsultaForm } from './consulta-form'

export default function ConsultaPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-appbg px-4 py-12">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gradient-brand">Clube HN Marketing</h1>
          <p className="mt-1 text-sm text-slate-500">
            Informe seu telefone para ver seu saldo de pontos, nivel e cupons disponiveis.
          </p>
        </div>

        <ConsultaForm />

        <p className="text-center text-xs text-slate-400">
          <Link href="/" className="underline">
            Voltar
          </Link>
        </p>
      </div>
    </main>
  )
}
