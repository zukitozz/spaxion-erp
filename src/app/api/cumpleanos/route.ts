import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { hoyPeru } from '@/lib/fechas'

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

  const [anioHoy, mesHoy, diaHoy] = hoyPeru().split('-').map(Number)
  const hoyMedianoche = new Date(Date.UTC(anioHoy, mesHoy - 1, diaHoy))

  const resultado = clientes.map((cliente) => {
    const nacimiento = cliente.fechaNacimiento as Date
    let proximo = new Date(Date.UTC(anioHoy, nacimiento.getUTCMonth(), nacimiento.getUTCDate()))
    if (proximo < hoyMedianoche) {
      proximo = new Date(Date.UTC(anioHoy + 1, nacimiento.getUTCMonth(), nacimiento.getUTCDate()))
    }
    const diasHasta = Math.round((proximo.getTime() - hoyMedianoche.getTime()) / MS_POR_DIA)
    const edadQueCumple = proximo.getUTCFullYear() - nacimiento.getUTCFullYear()
    // Mediodía UTC para que el navegador (UTC-5) muestre el mismo día y no el anterior.
    proximo.setUTCHours(12)

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
