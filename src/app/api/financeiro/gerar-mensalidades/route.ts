import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/types/database.types'

type MensalidadeInsert = Database['public']['Tables']['mensalidades']['Insert']

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Configuracao de seguranca ausente.' }, { status: 500 })
  }

  const secret = request.headers.get('x-cron-secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const competencia = `${ano}-${mes}-01`
  const vencimento = `${ano}-${mes}-10`

  const { data: parceiros, error: parceirosError } = await supabase
    .from('parceiros')
    .select('id, nome')
    .eq('ativo', true)

  if (parceirosError) {
    return NextResponse.json({ error: 'Erro ao buscar parceiros.' }, { status: 500 })
  }

  if (!parceiros || parceiros.length === 0) {
    return NextResponse.json({ geradas: 0, parceiros: [] })
  }

  const { data: mensalidades, error: mensalidadesError } = await supabase
    .from('mensalidades')
    .select('parceiro_id, plano_id, valor, competencia')
    .in(
      'parceiro_id',
      parceiros.map((p) => p.id),
    )
    .order('competencia', { ascending: false })

  if (mensalidadesError) {
    return NextResponse.json({ error: 'Erro ao buscar mensalidades.' }, { status: 500 })
  }

  if (!mensalidades || mensalidades.length === 0) {
    return NextResponse.json({ geradas: 0, parceiros: [] })
  }

  // Mensalidades estao ordenadas por competencia desc, entao a primeira
  // ocorrencia de cada parceiro e a sua mensalidade mais recente.
  const ultimaPorParceiro = new Map<string, { plano_id: string | null; valor: number }>()
  const competenciaAtualPorParceiro = new Set<string>()

  for (const m of mensalidades) {
    if (!ultimaPorParceiro.has(m.parceiro_id)) {
      ultimaPorParceiro.set(m.parceiro_id, { plano_id: m.plano_id, valor: m.valor })
    }
    if (m.competencia === competencia) {
      competenciaAtualPorParceiro.add(m.parceiro_id)
    }
  }

  const planoIds = Array.from(
    new Set(
      Array.from(ultimaPorParceiro.values())
        .map((m) => m.plano_id)
        .filter((id): id is string => !!id),
    ),
  )

  const planoPorId = new Map<string, { valor_mensal: number; ativo: boolean }>()
  if (planoIds.length > 0) {
    const { data: planos, error: planosError } = await supabase
      .from('planos')
      .select('id, valor_mensal, ativo')
      .in('id', planoIds)

    if (planosError) {
      return NextResponse.json({ error: 'Erro ao buscar planos.' }, { status: 500 })
    }

    for (const plano of planos ?? []) {
      planoPorId.set(plano.id, { valor_mensal: plano.valor_mensal, ativo: plano.ativo })
    }
  }

  const novas: MensalidadeInsert[] = []
  const parceirosGerados: string[] = []

  for (const parceiro of parceiros) {
    const ultima = ultimaPorParceiro.get(parceiro.id)
    if (!ultima) continue
    if (competenciaAtualPorParceiro.has(parceiro.id)) continue

    const plano = ultima.plano_id ? planoPorId.get(ultima.plano_id) : undefined
    const valor = plano && plano.ativo ? plano.valor_mensal : ultima.valor

    novas.push({
      parceiro_id: parceiro.id,
      plano_id: ultima.plano_id,
      competencia,
      valor,
      status: 'pendente',
      vencimento,
    })
    parceirosGerados.push(parceiro.nome)
  }

  if (novas.length === 0) {
    return NextResponse.json({ geradas: 0, parceiros: [] })
  }

  const { error: insertError } = await supabase.from('mensalidades').insert(novas)

  if (insertError) {
    return NextResponse.json({ error: 'Erro ao gerar mensalidades.' }, { status: 500 })
  }

  return NextResponse.json({ geradas: novas.length, parceiros: parceirosGerados })
}
