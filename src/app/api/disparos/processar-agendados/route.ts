import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processarDisparosAgendados } from '@/app/admin/disparos/actions'

export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const processados = await processarDisparosAgendados(supabase)

  return NextResponse.json({ processados })
}
