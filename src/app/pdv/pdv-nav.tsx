'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/pdv', label: 'Registrar pontos' },
  { href: '/pdv/cupom', label: 'Validar cupom' },
]

export function PdvNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-2 border-b border-slate-200 bg-white px-4">
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'border-accent text-accent'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
