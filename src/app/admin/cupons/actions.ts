'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sanitizarErro } from '@/lib/utils/erros'

type EmitirCupomState = { error?: string; ok?: boolean; codigo?: string }

export async function emitirCupomManual(_prevState: EmitirCupomState, formData: FormData): Promise<EmitirCupomState> {
  const telefone = String(formData.get('telefone') ?? '').trim()
  const cupomNivelId = String(formData.get('cupom_nivel_id') ?? '').trim()
  const parceiroId = String(formData.get('parceiro_id') ?? '').trim()

  if (!telefone || !cupomNivelId || !parceiroId) {
    return { error: 'Informe o telefone do membro, o nivel de cupom e o parceiro.' }
  }

  const supabase = await createClient()

  const { data: membro, error: membroError } = await supabase
    .from('membros')
    .select('id')
    .eq('telefone', telefone)
    .maybeSingle()

  if (membroError) {
    return { error: sanitizarErro(membroError, 'Erro interno. Tente novamente.') }
  }
  if (!membro) {
    return { error: 'Nenhum membro encontrado com esse telefone.' }
  }

  const { data, error } = await supabase
    .rpc('admin_emitir_cupom', {
      p_membro_id: membro.id,
      p_cupom_nivel_id: cupomNivelId,
      p_parceiro_id: parceiroId,
    })
    .single()

  if (error) {
    return { error: sanitizarErro(error, 'Nao foi possivel emitir o cupom.') }
  }

  revalidatePath('/admin/cupons')
  return { ok: true, codigo: (data as { codigo: string } | null)?.codigo }
}

export async function excluirCupom(cupomId: string) {
  const supabase = await createClient()
  await supabase.from('cupons').delete().eq('id', cupomId)
  revalidatePath('/admin/cupons')
}
