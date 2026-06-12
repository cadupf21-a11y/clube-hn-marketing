'use client'

import { logout } from '@/app/login/actions'

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-md border border-white/40 px-3 py-1.5 text-sm text-white hover:bg-white/10"
      >
        Sair
      </button>
    </form>
  )
}
