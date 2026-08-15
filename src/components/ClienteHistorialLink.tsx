'use client'

import Link from 'next/link'
import type { MouseEvent } from 'react'

interface ClienteHistorialLinkProps {
  clienteId: string
  nombre: string
  className?: string
  stopPropagation?: boolean
}

export function ClienteHistorialLink({ clienteId, nombre, className, stopPropagation }: ClienteHistorialLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (stopPropagation) event.stopPropagation()
  }

  return (
    <Link
      href={`/historico/atenciones?clienteId=${clienteId}`}
      onClick={handleClick}
      className={className ?? 'underline decoration-dotted underline-offset-2 transition hover:text-emerald-700'}
    >
      {nombre}
    </Link>
  )
}
