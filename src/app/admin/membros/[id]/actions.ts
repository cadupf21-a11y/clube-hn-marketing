'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sanitizarErro } from '@/lib/utils/erros'
import { cpfSchema, nomeSchema, telefoneSchema } from '@/lib/validations/schemas'
import { registrarAuditoria } from '@/lib/audit'

type FormState = { error?: string; ok?: boolean }

export async function atualizarMembro(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get('id') ?? '')
  const nome = String(formData.get('nome') ?? '').trim()
  const telefone = String(formData.get('telefone') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const cpf = String(formData.get('cpf') ?? '').trim()
  const diaRaw = String(formData.get('dia_nascimento') ?? '').trim()
  const mesRaw = String(formData.get('mes_nascimento') ?? '').trim()

  if (!id) {
    return { error: 'Informe nome e telefone.' }
  }

  const nomeResult = nomeSchema.safeParse(nome)
  if (!nomeResult.success) {
    return { error: nomeResult.error.errors[0].message }
  }

  const telefoneResult = telefoneSchema.safeParse(telefone)
  if (!telefoneResult.success) {
    return { error: telefoneResult.error.errors[0].message }
  }

  const cpfResult = cpfSchema.safeParse(cpf || null)
  if (!cpfResult.success) {
    return { error: cpfResult.error.errors[0].message }
  }

  let data_nascimento: string | null = null
  if (diaRaw || mesRaw) {
    const dia = Number(diaRaw)
    const mes = Number(mesRaw)
    const diasNoMes = Number.isInteger(mes) && mes >= 1 && mes <= 12 ? new Date(2000, mes, 0).getDate() : 0

    if (!diaRaw || !mesRaw || !Number.isInteger(dia) || !Number.isInteger(mes) || dia < 1 || dia > diasNoMes) {
      return { error: 'Informe um dia e mes de nascimento validos.' }
    }

    // Ano 2000 e um placeholder — apenas dia e mes tem significado
    data_nascimento = `2000-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('membros')
    .update({
      nome,
      telefone,
      email: email || null,
      cpf: cpfResult.data,
      data_nascimento,
    })
    .eq('id', id)

  if (error) {
    return { error: sanitizarErro(error, 'Erro ao atualizar membro.') }
  }

  revalidatePath(`/admin/membros/${id}`)
  return { ok: true }
}

export async function alternarAtivoMembro(
  membroId: string,
  ativo: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: { error?: string },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('membros').update({ ativo }).eq('id', membroId)

  if (error) {
    return { error: 'Erro ao executar operacao. Tente novamente.' }
  }

  await registrarAuditoria(supabase, 'status_membro', 'membro', membroId, { ativo })

  revalidatePath(`/admin/membros/${membroId}`)
  revalidatePath('/admin/membros')
  return {}
}

export async function ajustarPontos(_prevState: FormState, formData: FormData): Promise<FormState> {
  const membroId = String(formData.get('membro_id') ?? '')
  const parceiroId = String(formData.get('parceiro_id') ?? '')
  const pontosRaw = String(formData.get('pontos') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()

  const pontos = Number(pontosRaw)

  if (!membroId || !parceiroId) {
    return { error: 'Selecione o parceiro responsavel pelo ajuste.' }
  }

  if (!pontosRaw || Number.isNaN(pontos) || pontos === 0) {
    return { error: 'Informe uma quantidade de pontos diferente de zero.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_ajustar_pontos', {
    p_membro_id: membroId,
    p_parceiro_id: parceiroId,
    p_pontos: pontos,
    p_descricao: descricao,
  })

  if (error) {
    return { error: sanitizarErro(error, 'Nao foi possivel ajustar os pontos.') }
  }

  await registrarAuditoria(supabase, 'ajuste_pontos', 'membro', membroId, { pontos, descricao })

  revalidatePath(`/admin/membros/${membroId}`)
  return { ok: true }
}
