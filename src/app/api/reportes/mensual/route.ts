import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { rangoMesPeru } from '@/lib/fechas'
import { obtenerIngresosDelPeriodo } from '@/lib/reportesIngresos'

export const dynamic = 'force-dynamic'

function mesActual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const mes = new URL(req.url).searchParams.get('mes') || mesActual()
  const rango = rangoMesPeru(mes)

  const [ingresos, gastos, gastosPorCategoria] = await Promise.all([
    obtenerIngresosDelPeriodo(prisma, rango),
    prisma.gasto.aggregate({
      where: { activo: true, fecha: rango },
      _sum: { monto: true },
    }),
    prisma.gasto.groupBy({
      by: ['categoria'],
      where: { activo: true, fecha: rango },
      _sum: { monto: true },
    }),
  ])

  const totalGastos = gastos._sum.monto || 0

  return NextResponse.json({
    mes,
    ingresos,
    gastos: {
      total: totalGastos,
      porCategoria: gastosPorCategoria.map((item) => ({
        categoria: item.categoria || 'Sin categoría',
        total: item._sum.monto || 0,
      })),
    },
    diferencia: ingresos.total - totalGastos,
  })
}
