import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const MS_POR_DIA = 24 * 60 * 60 * 1000

type ColorEstado = 'VENCIDO' | 'PRONTO' | 'EN_RANGO' | 'SIN_DATO'

function calcularColor(diasRestantes: number | null): ColorEstado {
  if (diasRestantes === null) return 'SIN_DATO'
  if (diasRestantes <= 0) return 'VENCIDO'
  if (diasRestantes <= 7) return 'PRONTO'
  return 'EN_RANGO'
}

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard

  const clientes = await prisma.cliente.findMany({
    select: {
      id: true,
      nombre: true,
      celular: true,
      recordatorioPospuestoHasta: true,
      atenciones: {
        where: { estado: 'FINALIZADA', horaFin: { not: null } },
        orderBy: { horaFin: 'desc' },
        take: 1,
        select: {
          horaFin: true,
          diasProximoTratamiento: true,
          tratamiento: { select: { nombre: true, diasProximoTratamiento: true } },
        },
      },
    },
  })

  const hoy = new Date()

  const resultado = clientes.map((cliente) => {
    const ultima = cliente.atenciones[0]
    const diasSugeridos = ultima ? ultima.diasProximoTratamiento ?? ultima.tratamiento.diasProximoTratamiento ?? null : null

    let fechaSugerida: Date | null = null
    if (ultima && ultima.horaFin && diasSugeridos) {
      fechaSugerida = new Date(ultima.horaFin.getTime() + diasSugeridos * MS_POR_DIA)
      if (cliente.recordatorioPospuestoHasta && cliente.recordatorioPospuestoHasta > fechaSugerida) {
        fechaSugerida = cliente.recordatorioPospuestoHasta
      }
    }

    const diasRestantes = fechaSugerida
      ? Math.ceil((fechaSugerida.getTime() - hoy.getTime()) / MS_POR_DIA)
      : null

    return {
      clienteId: cliente.id,
      nombre: cliente.nombre,
      celular: cliente.celular,
      tratamiento: ultima?.tratamiento.nombre ?? null,
      fechaSugerida,
      diasRestantes,
      colorEstado: calcularColor(diasRestantes),
    }
  })

  const orden: Record<ColorEstado, number> = { VENCIDO: 0, PRONTO: 1, EN_RANGO: 2, SIN_DATO: 3 }
  resultado.sort((a, b) => {
    const ordenDiff = orden[a.colorEstado] - orden[b.colorEstado]
    if (ordenDiff !== 0) return ordenDiff
    if (a.diasRestantes === null || b.diasRestantes === null) return 0
    return a.diasRestantes - b.diasRestantes
  })

  return NextResponse.json(resultado)
}
