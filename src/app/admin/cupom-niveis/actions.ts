'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'

type CupomBeneficioTipo = Database['public']['Tables']['cupom_niveis']['Row']['tipo_beneficio']

type CamposNivel =
  | { ok: false; error: string }
  | {
      ok: true
      values: {
        nome: string
        descricao: string | null
        pontos_necessarios: number
        tipo_beneficio: CupomBeneficioTipo
        valor_beneficio: number | null
        validade_dias: number
        ativo: boolean
      }
      parceiroIds: string[]
    }

function lerCampos(formData: FormData): CamposNivel {
  const nome = String(formData.get('nome') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const pontosRaw = String(formData.get('pontos_necessarios') ?? '').trim()
  const tipo_beneficio = String(formData.get('tipo_beneficio') ?? '') as CupomBeneficioTipo
  const valorRaw = String(formData.get('valor_beneficio') ?? '').trim()
  const validadeRaw = String(formData.get('validade_dias') ?? '').trim()
  const ativo = formData.get('ativo') === 'on'
  const parceiroIds = formData.getAll('parceiro_ids').map((v) => String(v))

  const pontos_necessarios = Number(pontosRaw)
  const valor_beneficio = valorRaw ? Number(valorRaw) : null
  const validade_dias = validadeRaw ? Number(validadeRaw) : 30

  if (!nome) return { ok: false, error: 'Informe o nome do nivel.' }
  if (!pontosRaw || Number.isNaN(pontos_necessarios) || pontos_necessarios <= 0) {
    return { ok: false, error: 'Informe uma quantidade de pontos valida.' }
  }
  if (!['desconto_percentual', 'desconto_valor', 'produto_gratis', 'outro'].includes(tipo_beneficio)) {
    return { ok: false, error: 'Selecione um tipo de beneficio valido.' }
  }
  if (validadeRaw && (Number.isNaN(validade_dias) || validade_dias <= 0)) {
    return { ok: false, error: 'Informe uma validade em dias valida.' }
  }

  return {
    ok: true,
    values: {
      nome,
      descricao: descricao || null,
      pontos_necessarios,
      tipo_beneficio,
      valor_beneficio,
      validade_dias,
      ativo,
    },
    parceiroIds,
  }
}

async function sincronizarParceiros(cupomNivelId: string, parceiroIds: string[]): Promise<string | null> {
  const supabase = await createClient()

  const { error: deleteError } = await supabase
    .from('cupom_nivel_parceiros')
    .delete()
    .eq('cupom_nivel_id', cupomNivelId)

  if (deleteError) {
    return deleteError.message
  }

  if (parceiroIds.length > 0) {
    const { error: insertError } = await supabase
      .from('cupom_nivel_parceiros')
      .insert(parceiroIds.map((parceiro_id) => ({ cupom_nivel_id: cupomNivelId, parceiro_id })))

    if (insertError) {
      return insertError.message
    }
  }

  return null
}

export async function criarNivel(_prevState: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const parsed = lerCampos(formData)
  if (!parsed.ok) return { error: parsed.error }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cupom_niveis')
    .insert(parsed.values)
    .select('id')
    .single()

  if (error || !data) {
    return { error: error?.message ?? 'Erro ao criar nivel.' }
  }

  const vinculoError = await sincronizarParceiros(data.id, parsed.parceiroIds)
  if (vinculoError) {
    return { error: `Nivel criado, mas houve erro ao vincular parceiros: ${vinculoError}` }
  }

  revalidatePath('/admin/cupom-niveis')
  redirect('/admin/cupom-niveis')
}

export async function atualizarNivel(_prevState: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Nivel invalido.' }

  const parsed = lerCampos(formData)
  if (!parsed.ok) return { error: parsed.error }

  const supabase = await createClient()
  const { error } = await supabase.from('cupom_niveis').update(parsed.values).eq('id', id)

  if (error) {
    return { error: error.message }
  }

  const vinculoError = await sincronizarParceiros(id, parsed.parceiroIds)
  if (vinculoError) {
    return { error: `Nivel atualizado, mas houve erro ao vincular parceiros: ${vinculoError}` }
  }

  revalidatePath('/admin/cupom-niveis')
  revalidatePath(`/admin/cupom-niveis/${id}`)
  redirect('/admin/cupom-niveis')
}

export async function alternarAtivoNivel(nivelId: string, ativo: boolean) {
  const supabase = await createClient()
  await supabase.from('cupom_niveis').update({ ativo }).eq('id', nivelId)
  revalidatePath('/admin/cupom-niveis')
}

export async function excluirNivel(nivelId: string) {
  const supabase = await createClient()
  await supabase.from('cupom_niveis').delete().eq('id', nivelId)
  revalidatePath('/admin/cupom-niveis')
}
