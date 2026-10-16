import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { enviarResumenDiario } from '@/lib/facturador'
import { sincronizarCdrPendientes } from '@/lib/enviarFactura'

export const dynamic = 'force-dynamic'

// Informa a SUNAT las boletas de días anteriores y descarga los CDR pendientes de facturas/notas. Lo puede llamar un cron externo con
// `Authorization: Bearer $CRON_SECRET`, o un ADMIN/SUPERVISOR con sesión.
export async function POST(req: Request) {
  const secreto = process.env.CRON_SECRET
  const esCron = Boolean(secreto) && req.headers.get('authorization') === `Bearer ${secreto}`
  if (!esCron) {
    const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
    if (guard) return guard
  }

  try {
    const resumen = await enviarResumenDiario()
    const cdr = await sincronizarCdrPendientes()
    return NextResponse.json({ resumen, cdr })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido al enviar el resumen diario'
    return NextResponse.json({ error: mensaje }, { status: 502 })
  }
}
