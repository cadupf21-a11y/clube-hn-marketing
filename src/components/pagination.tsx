import Link from 'next/link'

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number
  totalPages: number
  basePath: string
  searchParams?: Record<string, string | undefined>
}) {
  if (totalPages <= 1) return null

  function buildHref(targetPage: number) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (value) params.set(key, value)
    }
    params.set('page', String(targetPage))
    return `${basePath}?${params.toString()}`
  }

  const temAnterior = page > 1
  const temProxima = page < totalPages

  return (
    <div className="flex items-center justify-between pt-2">
      {temAnterior ? (
        <Link
          href={buildHref(page - 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Anterior
        </Link>
      ) : (
        <span className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-400">Anterior</span>
      )}

      <span className="text-sm text-slate-600">
        Pagina {page} de {totalPages}
      </span>

      {temProxima ? (
        <Link
          href={buildHref(page + 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Proxima
        </Link>
      ) : (
        <span className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-400">Proxima</span>
      )}
    </div>
  )
}
