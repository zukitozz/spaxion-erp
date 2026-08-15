import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  if (req.nextUrl.pathname.startsWith('/reportes') && !['SUPERVISOR', 'ADMIN'].includes(req.auth?.user.role ?? '')) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  if (req.nextUrl.pathname.startsWith('/usuarios') && req.auth?.user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*', '/clientes/:path*', '/seguimiento/:path*', '/cabinas/:path*', '/bandeja/:path*', '/inventario/:path*', '/facturacion/:path*', '/descuentos/:path*', '/reportes/:path*', '/usuarios/:path*', '/ajustes/:path*'],
}
