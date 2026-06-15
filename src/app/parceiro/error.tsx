'use client'

import { useEffect } from 'react'

export default function ParceiroError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <span className="text-2xl">!</span>
        </div>
        <h2 className="mt-4 text-base font-medium text-slate-900">Algo deu errado</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ocorreu um erro ao carregar esta pagina. Tente novamente em alguns instantes.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
