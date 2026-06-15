'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { pinSchema } from '@/lib/validations/schemas'

const ATENDENTE_COOKIE = 'atendente_id'

const MAX_TENTATIVAS = 5
const JANELA_MS = 10 * 60 * 1000 // 10 minutos

const tentativasPin = new Map<string, { tentativas: number; primeiraFalha: number }>()

export async function identificarAtendente(_prevState: { error?: string }, formData: FormData) {
  const atendenteId = String(formData.get('atendente_id') ?? '')
  const pin = String(formData.get('pin') ?? '')

  if (!atendenteId) {
    return { error: 'Selecione o atendente e informe o PIN.' }
  }

  const pinResult = pinSchema.safeParse(pin)
  if (!pinResult.success) {
    return { error: pinResult.error.errors[0].message }
  }

  const agora = Date.now()
  const registro = tentativasPin.get(atendenteId)

  if (registro && agora - registro.primeiraFalha > JANELA_MS) {
    tentativasPin.delete(atendenteId)
  }

  const registroAtual = tentativasPin.get(atendenteId)
  if (registroAtual && registroAtual.tentativas >= MAX_TENTATIVAS) {
    return { error: 'Muitas tentativas. Aguarde 10 minutos.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('verificar_pin_atendente', {
    p_atendente_id: atendenteId,
    p_pin: pin,
  })

  if (error || !data || data.length === 0) {
    const existente = tentativasPin.get(atendenteId)
    if (existente) {
      existente.tentativas += 1
    } else {
      tentativasPin.set(atendenteId, { tentativas: 1, primeiraFalha: agora })
    }
    return { error: 'PIN invalido.' }
  }

  tentativasPin.delete(atendenteId)

  const cookieStore = await cookies()
  cookieStore.set(ATENDENTE_COOKIE, data[0].id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 horas
  })

  redirect('/pdv')
}

export async function sairPdv() {
  const cookieStore = await cookies()
  cookieStore.delete(ATENDENTE_COOKIE)
  redirect('/atendente')
}
