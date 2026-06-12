import { redirect } from 'next/navigation'
import { getPerfilAtual } from '@/lib/auth/perfil'
import { DashboardShell, type NavItem } from '@/components/dashboard-shell'

const navItems: NavItem[] = [
  { href: '/admin', label: 'Visao geral' },
  { href: '/admin/membros', label: 'Clientes' },
  { href: '/admin/parceiros', label: 'Parceiros' },
  { href: '/admin/cupom-niveis', label: 'Configuracoes' },
  { href: '/admin/cupons', label: 'Cupons' },
  { href: '/admin/financeiro', label: 'Financeiro' },
  { href: '/admin/disparos', label: 'Disparos' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const perfil = await getPerfilAtual()

  if (!perfil || perfil.role !== 'admin') {
    redirect('/login')
  }

  return (
    <DashboardShell title="Clube HN — Admin" navItems={navItems} userLabel={perfil.nome}>
      {children}
    </DashboardShell>
  )
}
