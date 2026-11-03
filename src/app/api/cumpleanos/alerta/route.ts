import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { hoyPeru } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

// Cumpleaños de ayer, hoy y mañana (hora de Perú) para la alerta que se muestra al iniciar sesión.
export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard

  const clientes = await prisma.cliente.findMany({
    where: { fechaNacimiento: { not: null } },
    select: { id: true, nombre: true, celular: true, fechaNacimiento: true },
    orderBy: { nombre: 'asc' },
  })

  const [anio, mes, dia] = hoyPeru().split('-').map(Number)
  // fechaNacimiento se guarda a mediodía peruano, por eso se compara mes/día en UTC igual que /api/cumpleanos.
  const coincide = (offset: number) => {
    const objetivo = new Date(Date.UTC(anio, mes - 1, dia + offset))
    return clientes
      .filter((cliente) => {
        const nacimiento = cliente.fechaNacimiento as Date
        return nacimiento.getUTCMonth() === objetivo.getUTCMonth() && nacimiento.getUTCDate() === objetivo.getUTCDate()
      })
      .map(({ id, nombre, celular }) => ({ clienteId: id, nombre, celular }))
  }

  return NextResponse.json({ ayer: coincide(-1), hoy: coincide(0), manana: coincide(1) })
}
