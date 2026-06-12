import { redirect } from 'next/navigation'
import { getPerfilAtual } from '@/lib/auth/perfil'
import { DashboardShell, type NavItem } from '@/components/dashboard-shell'

const navItems: NavItem[] = [
  { href: '/parceiro', label: 'Visao geral' },
  { href: '/parceiro/clientes', label: 'Clientes' },
  { href: '/parceiro/transacoes', label: 'Transacoes' },
  { href: '/parceiro/cupons', label: 'Cupons' },
  { href: '/parceiro/cupons-resgatados', label: 'Cupons resgatados' },
  { href: '/parceiro/cupom-niveis', label: 'Niveis de cupom' },
  { href: '/parceiro/atendentes', label: 'Atendentes' },
  { href: '/parceiro/disparos', label: 'Disparos' },
  { href: '/atendente', label: 'PDV (PIN)' },
]

export default async function ParceiroLayout({ children }: { children: React.ReactNode }) {
  const perfil = await getPerfilAtual()

  if (!perfil || perfil.role !== 'parceiro') {
    redirect('/login')
  }

  return (
    <DashboardShell title="Clube HN — Parceiro" navItems={navItems} userLabel={perfil.nome}>
      {children}
    </DashboardShell>
  )
}
