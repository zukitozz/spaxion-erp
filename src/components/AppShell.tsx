'use client'

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { Menu } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { Sidebar } from '@/components/Sidebar'
import { useAppStore } from '@/store/useAppStore'

export function AppShell({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const collapsed = useAppStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const isLogin = pathname.startsWith('/auth/login')

  if (isLogin || !session) return <>{children}</>

  return (
    <div className="min-h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleSidebar}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#c19a4b]/35 bg-[linear-gradient(120deg,#00483f,#00655a)] px-4 py-3 text-[#f4f0e8] shadow-[0_8px_24px_rgba(0,72,63,0.18)] md:hidden">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c19a4b]/70 text-[#fffdf7] transition hover:bg-[#17665a]"
        >
          <Menu size={20} />
        </button>
        <BrandLogo compact onDark />
      </header>

      <main className={`transition-all duration-200 ${collapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        {children}
      </main>
    </div>
  )
}
