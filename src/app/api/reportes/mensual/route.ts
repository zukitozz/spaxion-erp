import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { mesActualPeru, rangoMesPeru } from '@/lib/fechas'
import { obtenerIngresosDelPeriodo } from '@/lib/reportesIngresos'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const mes = new URL(req.url).searchParams.get('mes') || mesActualPeru()
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
