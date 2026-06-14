const TERMOS_ERRO_BANCO = ['violates', 'duplicate', 'constraint', 'relation', 'column', 'syntax']

function ehErroSupabase(error: unknown): boolean {
  if (error instanceof Error && error.name === 'PostgrestError') return true

  if (error && typeof error === 'object' && 'code' in error && 'details' in error && 'hint' in error) {
    return true
  }

  const mensagem = error instanceof Error ? error.message : ''
  return TERMOS_ERRO_BANCO.some((termo) => mensagem.toLowerCase().includes(termo))
}

/**
 * Evita expor mensagens cruas de erro do Supabase (constraints, nomes de
 * tabela/coluna, etc.) ao usuario final. Erros que nao vierem do Supabase
 * (ex.: validacoes da propria action) mantem a mensagem original.
 */
export function sanitizarErro(error: unknown, fallback: string): string {
  if (ehErroSupabase(error)) return fallback

  if (error instanceof Error && error.message) return error.message

  return fallback
}
