'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sanitizarErro } from '@/lib/utils/erros'

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function exportarMembrosCsv() {
  const supabase = await createClient()
  const { data: membros, error } = await supabase
    .from('membros')
    .select('nome, telefone, email, cpf, pontos_saldo, ativo, created_at, data_nascimento')
    .order('nome')

  if (error) {
    throw new Error(sanitizarErro(error, 'Erro interno. Tente novamente.'))
  }

  const header = [
    'Nome',
    'Telefone',
    'Email',
    'CPF',
    'Pontos',
    'Status',
    'Data de cadastro',
    'Data de nascimento (dia/mes)',
  ]

  const linhas = (membros ?? []).map((m) => [
    m.nome,
    m.telefone,
    m.email ?? '',
    m.cpf ?? '',
    String(m.pontos_saldo),
    m.ativo ? 'Ativo' : 'Bloqueado',
    new Date(m.created_at).toLocaleDateString('pt-BR'),
    m.data_nascimento ? `${m.data_nascimento.slice(8, 10)}/${m.data_nascimento.slice(5, 7)}` : '',
  ])

  return [header, ...linhas].map((linha) => linha.map(escapeCsv).join(',')).join('\n')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function excluirMembro(membroId: string, _prevState: { error?: string }): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('membros').delete().eq('id', membroId)

  if (error) {
    return { error: 'Erro ao executar operacao. Tente novamente.' }
  }

  revalidatePath('/admin/membros')
  return {}
}
