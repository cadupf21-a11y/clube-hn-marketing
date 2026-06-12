'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const ATENDENTE_COOKIE = 'atendente_id'

export async function identificarAtendente(_prevState: { error?: string }, formData: FormData) {
  const atendenteId = String(formData.get('atendente_id') ?? '')
  const pin = String(formData.get('pin') ?? '')

  if (!atendenteId || !pin) {
    return { error: 'Selecione o atendente e informe o PIN.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('verificar_pin_atendente', {
    p_atendente_id: atendenteId,
    p_pin: pin,
  })

  if (error || !data || data.length === 0) {
    return { error: 'PIN invalido.' }
  }

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
