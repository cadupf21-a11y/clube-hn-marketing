'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function criarAtendente(_prevState: { error?: string }, formData: FormData) {
  const nome = String(formData.get('nome') ?? '').trim()
  const pin = String(formData.get('pin') ?? '').trim()

  if (!nome || !pin) {
    return { error: 'Informe nome e PIN.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('criar_atendente', { p_nome: nome, p_pin: pin })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/parceiro/atendentes')
  return { error: undefined }
}

export async function redefinirPin(formData: FormData) {
  const atendenteId = String(formData.get('atendente_id') ?? '')
  const pin = String(formData.get('pin') ?? '').trim()

  if (!atendenteId || !pin) {
    return { error: 'PIN invalido.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('redefinir_pin_atendente', {
    p_atendente_id: atendenteId,
    p_pin: pin,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/parceiro/atendentes')
  return { error: undefined }
}

export async function alternarAtivo(atendenteId: string, ativo: boolean) {
  const supabase = await createClient()
  await supabase.from('atendentes').update({ ativo }).eq('id', atendenteId)
  revalidatePath('/parceiro/atendentes')
}

export async function excluirAtendente(atendenteId: string) {
  const supabase = await createClient()
  await supabase.from('atendentes').delete().eq('id', atendenteId)
  revalidatePath('/parceiro/atendentes')
}
