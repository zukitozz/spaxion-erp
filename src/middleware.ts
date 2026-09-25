import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth(authConfig)

const ESTETICISTA_ALLOWED = ['/bandeja']
const ADMIN_BLOCKED = ['/cabinas', '/usuarios', '/reportes', '/ajustes', '/inventario', '/productos', '/tratamientos']

function coincide(pathname: string, prefijos: string[]) {
  return prefijos.some((prefijo) => pathname === prefijo || pathname.startsWith(`${prefijo}/`))
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl
  const role = req.auth?.user?.role
  if (!role) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname + search)
    return NextResponse.redirect(loginUrl)
  }

  if (role === 'ESTETICISTA' && !coincide(pathname, ESTETICISTA_ALLOWED)) {
    return NextResponse.redirect(new URL('/bandeja', req.url))
  }

  if (role === 'ADMIN' && coincide(pathname, ADMIN_BLOCKED)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth/login|legal).*)'],
}
