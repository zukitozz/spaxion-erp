import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const MS_POR_DIA = 24 * 60 * 60 * 1000

type ColorEstado = 'HOY' | 'PRONTO' | 'EN_RANGO' | 'LEJANO'

function calcularColor(diasHasta: number): ColorEstado {
  if (diasHasta === 0) return 'HOY'
  if (diasHasta <= 7) return 'PRONTO'
  if (diasHasta <= 30) return 'EN_RANGO'
  return 'LEJANO'
}

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard

  const clientes = await prisma.cliente.findMany({
    where: { fechaNacimiento: { not: null } },
    select: { id: true, nombre: true, celular: true, email: true, fechaNacimiento: true },
  })

  const hoy = new Date()
  const hoyMedianoche = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

  const resultado = clientes.map((cliente) => {
    const nacimiento = cliente.fechaNacimiento as Date
    let proximo = new Date(hoyMedianoche.getFullYear(), nacimiento.getMonth(), nacimiento.getDate())
    if (proximo < hoyMedianoche) {
      proximo = new Date(hoyMedianoche.getFullYear() + 1, nacimiento.getMonth(), nacimiento.getDate())
    }
    const diasHasta = Math.round((proximo.getTime() - hoyMedianoche.getTime()) / MS_POR_DIA)
    const edadQueCumple = proximo.getFullYear() - nacimiento.getFullYear()

    return {
      clienteId: cliente.id,
      nombre: cliente.nombre,
      celular: cliente.celular,
      email: cliente.email,
      fechaNacimiento: cliente.fechaNacimiento,
      proximoCumpleanos: proximo,
      diasHasta,
      edadQueCumple,
      colorEstado: calcularColor(diasHasta),
    }
  })

  resultado.sort((a, b) => a.diasHasta - b.diasHasta)

  return NextResponse.json(resultado)
}
