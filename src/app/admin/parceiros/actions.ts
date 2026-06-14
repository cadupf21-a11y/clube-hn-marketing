'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizarErro } from '@/lib/utils/erros'
import type { Database } from '@/lib/types/database.types'

type FormState = { error?: string; ok?: boolean }

type CamposParceiro =
  | { ok: false; error: string }
  | { ok: true; values: Database['public']['Tables']['parceiros']['Insert'] }

function lerCampos(formData: FormData): CamposParceiro {
  const nome = String(formData.get('nome') ?? '').trim()
  const razao_social = String(formData.get('razao_social') ?? '').trim()
  const cnpj = String(formData.get('cnpj') ?? '').trim()
  const categoria = String(formData.get('categoria') ?? '').trim()
  const telefone = String(formData.get('telefone') ?? '').trim()
  const whatsapp = String(formData.get('whatsapp') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const endereco = String(formData.get('endereco') ?? '').trim()
  const cidade = String(formData.get('cidade') ?? '').trim()
  const estado = String(formData.get('estado') ?? '').trim()
  const logo_url = String(formData.get('logo_url') ?? '').trim()
  const cor_destaque = String(formData.get('cor_destaque') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const google_maps_url = String(formData.get('google_maps_url') ?? '').trim()
  const taxaRaw = String(formData.get('taxa_conversao_pontos') ?? '').trim()
  const tetoRaw = String(formData.get('teto_pontos_mensal') ?? '').trim()
  const ativo = formData.get('ativo') === 'on'

  if (!nome) {
    return { ok: false, error: 'Informe o nome do parceiro.' }
  }

  const taxa = Number(taxaRaw)
  if (!taxaRaw || Number.isNaN(taxa) || taxa <= 0) {
    return { ok: false, error: 'Informe uma taxa de conversao valida.' }
  }

  const teto = tetoRaw ? Number(tetoRaw) : null
  if (tetoRaw && (Number.isNaN(teto) || (teto as number) < 0)) {
    return { ok: false, error: 'Informe um teto de pontos valido.' }
  }

  return {
    ok: true,
    values: {
      nome,
      razao_social: razao_social || null,
      cnpj: cnpj || null,
      categoria: categoria || null,
      telefone: telefone || null,
      whatsapp: whatsapp || null,
      email: email || null,
      endereco: endereco || null,
      cidade: cidade || null,
      estado: estado || null,
      logo_url: logo_url || null,
      cor_destaque: cor_destaque || null,
      descricao: descricao || null,
      google_maps_url: google_maps_url || null,
      taxa_conversao_pontos: taxa,
      teto_pontos_mensal: teto,
      ativo,
    },
  }
}

export async function criarParceiro(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = lerCampos(formData)
  if (!parsed.ok) return { error: parsed.error }

  const supabase = await createClient()
  const { data, error } = await supabase.from('parceiros').insert(parsed.values).select('id').single()

  if (error || !data) {
    return { error: sanitizarErro(error, 'Erro ao criar parceiro.') }
  }

  revalidatePath('/admin/parceiros')
  redirect(`/admin/parceiros/${data.id}`)
}

export async function atualizarParceiro(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Parceiro invalido.' }

  const parsed = lerCampos(formData)
  if (!parsed.ok) return { error: parsed.error }

  const supabase = await createClient()
  const { error } = await supabase.from('parceiros').update(parsed.values).eq('id', id)

  if (error) {
    return { error: sanitizarErro(error, 'Erro ao atualizar parceiro.') }
  }

  revalidatePath(`/admin/parceiros/${id}`)
  revalidatePath('/admin/parceiros')
  return { ok: true }
}

export async function alternarAtivoParceiro(parceiroId: string, ativo: boolean) {
  const supabase = await createClient()
  await supabase.from('parceiros').update({ ativo }).eq('id', parceiroId)
  revalidatePath(`/admin/parceiros/${parceiroId}`)
  revalidatePath('/admin/parceiros')
}

export async function criarUsuarioParceiro(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parceiroId = String(formData.get('parceiro_id') ?? '')
  const email = String(formData.get('email') ?? '').trim()
  const senha = String(formData.get('senha') ?? '')

  if (!parceiroId) return { error: 'Parceiro invalido.' }
  if (!email) return { error: 'Informe o e-mail do usuario.' }
  if (senha.length < 6) return { error: 'A senha deve ter pelo menos 6 caracteres.' }

  const supabase = await createClient()
  const { data: parceiro } = await supabase.from('parceiros').select('nome').eq('id', parceiroId).maybeSingle()
  if (!parceiro) return { error: 'Parceiro nao encontrado.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: parceiro.nome, role: 'parceiro', parceiro_id: parceiroId },
  })

  if (error) {
    return { error: sanitizarErro(error, 'Nao foi possivel criar o usuario.') }
  }

  revalidatePath(`/admin/parceiros/${parceiroId}`)
  return { ok: true }
}

export async function resetarSenhaUsuarioParceiro(_prevState: FormState, formData: FormData): Promise<FormState> {
  const perfilId = String(formData.get('perfil_id') ?? '')
  const parceiroId = String(formData.get('parceiro_id') ?? '')
  const senha = String(formData.get('senha') ?? '')

  if (!perfilId) return { error: 'Usuario invalido.' }
  if (senha.length < 6) return { error: 'A senha deve ter pelo menos 6 caracteres.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(perfilId, { password: senha })

  if (error) {
    return { error: sanitizarErro(error, 'Nao foi possivel redefinir a senha.') }
  }

  revalidatePath(`/admin/parceiros/${parceiroId}`)
  return { ok: true }
}

export async function criarAtendenteAdmin(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parceiroId = String(formData.get('parceiro_id') ?? '')
  const nome = String(formData.get('nome') ?? '').trim()
  const pin = String(formData.get('pin') ?? '').trim()

  if (!parceiroId) return { error: 'Parceiro invalido.' }
  if (!nome || !pin) return { error: 'Informe nome e PIN.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('criar_atendente', {
    p_parceiro_id: parceiroId,
    p_nome: nome,
    p_pin: pin,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/parceiros/${parceiroId}`)
  return { ok: true }
}

export async function redefinirPinAtendenteAdmin(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parceiroId = String(formData.get('parceiro_id') ?? '')
  const atendenteId = String(formData.get('atendente_id') ?? '')
  const pin = String(formData.get('pin') ?? '').trim()

  if (!parceiroId) return { error: 'Parceiro invalido.' }
  if (!atendenteId || !pin) return { error: 'PIN invalido.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('redefinir_pin_atendente', {
    p_parceiro_id: parceiroId,
    p_atendente_id: atendenteId,
    p_pin: pin,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/parceiros/${parceiroId}`)
  return { ok: true }
}

export async function alternarAtivoAtendenteAdmin(parceiroId: string, atendenteId: string, ativo: boolean) {
  const supabase = await createClient()
  await supabase.from('atendentes').update({ ativo }).eq('id', atendenteId).eq('parceiro_id', parceiroId)
  revalidatePath(`/admin/parceiros/${parceiroId}`)
}

export async function excluirAtendenteAdmin(parceiroId: string, atendenteId: string) {
  const supabase = await createClient()
  await supabase.from('atendentes').delete().eq('id', atendenteId).eq('parceiro_id', parceiroId)
  revalidatePath(`/admin/parceiros/${parceiroId}`)
}

export async function excluirParceiro(parceiroId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const [{ count: membrosCount }, { count: transacoesCount }] = await Promise.all([
    supabase.from('membros').select('id', { count: 'exact', head: true }).eq('origem_parceiro_id', parceiroId),
    supabase.from('transacoes').select('id', { count: 'exact', head: true }).eq('parceiro_id', parceiroId),
  ])

  if ((membrosCount ?? 0) > 0 || (transacoesCount ?? 0) > 0) {
    return { error: 'Parceiro possui dados vinculados e nao pode ser excluido.' }
  }

  const { error } = await supabase.from('parceiros').delete().eq('id', parceiroId)

  if (error) {
    return { error: sanitizarErro(error, 'Erro ao excluir parceiro.') }
  }

  revalidatePath('/admin/parceiros')
  return {}
}
