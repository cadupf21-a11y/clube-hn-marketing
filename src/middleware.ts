import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = ['/login', '/auth']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isPublic = pathname === '/' || PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!user) {
    if (isPublic) return supabaseResponse
    // /atendente e /pdv nao tem login proprio: o atendente so digita o PIN.
    // Preserva o destino para voltar direto pra la apos o parceiro logar no dispositivo.
    return redirectTo(request, '/login', { redirect: pathname })
  }

  // usuario logado tentando acessar /login -> manda para o painel correto
  if (pathname.startsWith('/login')) {
    const redirectParam = request.nextUrl.searchParams.get('redirect')
    if (redirectParam?.startsWith('/atendente') || redirectParam?.startsWith('/pdv')) {
      return redirectTo(request, redirectParam)
    }

    const role = await getRole(supabase, user.id)
    return redirectTo(request, role === 'admin' ? '/admin' : '/parceiro')
  }

  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/parceiro') ||
    pathname.startsWith('/atendente') ||
    pathname.startsWith('/pdv')
  ) {
    const role = await getRole(supabase, user.id)

    if (!role) return redirectTo(request, '/login')

    if (pathname.startsWith('/admin') && role !== 'admin') {
      return redirectTo(request, '/parceiro')
    }

    if (
      (pathname.startsWith('/parceiro') || pathname.startsWith('/atendente') || pathname.startsWith('/pdv')) &&
      role !== 'parceiro'
    ) {
      return redirectTo(request, '/admin')
    }

    // /pdv exige que um atendente tenha sido identificado via PIN
    if (pathname.startsWith('/pdv') && !request.cookies.get('atendente_id')?.value) {
      return redirectTo(request, '/atendente')
    }
  }

  return supabaseResponse
}

async function getRole(
  supabase: Awaited<ReturnType<typeof updateSession>>['supabase'],
  userId: string
) {
  const { data } = await supabase.from('perfis').select('role').eq('id', userId).single()
  return data?.role ?? null
}

function redirectTo(request: NextRequest, path: string, searchParams?: Record<string, string>) {
  const url = request.nextUrl.clone()
  url.pathname = path
  url.search = ''
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value)
    }
  }
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
