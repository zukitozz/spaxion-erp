'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  BarChart3,
  Boxes,
  CalendarCheck,
  Camera,
  DoorClosed,
  History,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PhoneCall,
  Receipt,
  Settings,
  ShoppingBag,
  Sparkles,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { useConfiguracion } from '@/components/ConfiguracionProvider'
import { ROLE_LABELS, type UserRole } from '@/types/user'

const STAFF: UserRole[] = ['ADMIN', 'SUPERVISOR']

const navigation: { href: string; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: STAFF },
  { href: '/clientes', label: 'Clientes', icon: Users, roles: STAFF },
  { href: '/seguimiento', label: 'Seguimiento', icon: PhoneCall, roles: STAFF },
  { href: '/citas', label: 'Citas', icon: CalendarCheck, roles: STAFF },
  { href: '/cabinas', label: 'Cabinas', icon: DoorClosed, roles: ['SUPERVISOR'] },
  { href: '/bandeja', label: 'Bandeja de Atención', icon: Camera, roles: ['ESTETICISTA'] },
  { href: '/inventario', label: 'Inventario', icon: Boxes, roles: ['SUPERVISOR'] },
  { href: '/productos', label: 'Productos', icon: ShoppingBag, roles: ['SUPERVISOR'] },
  { href: '/tratamientos', label: 'Tratamientos', icon: Sparkles, roles: ['SUPERVISOR'] },
  { href: '/facturacion', label: 'Facturación', icon: Receipt, roles: STAFF },
  { href: '/reportes', label: 'Reportes', icon: BarChart3, roles: ['SUPERVISOR'] },
  { href: '/historico/atenciones', label: 'Histórico de Atenciones', icon: History, roles: ['ADMIN', 'SUPERVISOR'] },
  { href: '/usuarios', label: 'Usuarios', icon: UserCog, roles: ['SUPERVISOR'] },
  { href: '/ajustes', label: 'Ajustes', icon: Settings, roles: ['SUPERVISOR'] },
]

function getActiveHref(pathname: string) {
  let best: string | null = null
  for (const item of navigation) {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`)
    if (matches && (!best || item.href.length > best.length)) best = item.href
  }
  return best
}

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { usaCabinas } = useConfiguracion()
  const role = session?.user?.role
  const items = navigation.filter((item) => (!role || item.roles.includes(role)) && (item.href !== '/cabinas' || usaCabinas))
  const activeHref = getActiveHref(pathname)
  const initials = (session?.user?.name || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col bg-[linear-gradient(180deg,#005a4f_0%,#00483f_50%,#043a31_100%)] text-[#f4f0e8] transition-all duration-200 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="flex items-center gap-2 border-b border-[#c19a4b]/30 p-4">
          {!collapsed && <BrandLogo compact onDark />}
          <button
            type="button"
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            onClick={onToggleCollapsed}
            className="ml-auto hidden h-9 w-9 items-center justify-center rounded-full text-[#f4f0e8] transition hover:bg-[#17665a] md:flex"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onCloseMobile}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-[#f4f0e8] transition hover:bg-[#17665a] md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = item.href === activeHref
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-[#c19a4b] font-semibold text-[#173d36]' : 'text-[#d8e4dc] hover:bg-[#17665a] hover:text-white'
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span className={collapsed ? 'hidden' : 'truncate'}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[#c19a4b]/30 p-3">
          <div className={`flex items-center gap-3 rounded-xl px-2 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c19a4b] text-sm font-semibold text-[#173d36]">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#fffdf7]">{session?.user?.name}</p>
                <p className="truncate text-[11px] uppercase tracking-[0.16em] text-[#c6d9cd]">{role ? ROLE_LABELS[role] : ''}</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: '/auth/login' })}
            title={collapsed ? 'Salir' : undefined}
            className={`mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#f4d5bd] transition hover:bg-[#7a2e2e] hover:text-white ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            <span className={collapsed ? 'hidden' : ''}>Salir</span>
          </button>
        </div>
      </aside>
    </>
  )
}
