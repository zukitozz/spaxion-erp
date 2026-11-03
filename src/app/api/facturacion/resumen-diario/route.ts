import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'
import { sincronizarCdrPendientes } from '@/lib/enviarFactura'

export const dynamic = 'force-dynamic'

// Descarga los CDR pendientes de facturas/notas (disponibles 7 días en el facturador). El resumen diario de boletas
// ya lo envía el facturador solo, por eso no se llama aquí. Lo puede llamar un cron externo con
// `Authorization: Bearer $CRON_SECRET`, o un ADMIN/SUPERVISOR con sesión.
export async function POST(req: Request) {
  const secreto = process.env.CRON_SECRET
  const esCron = Boolean(secreto) && req.headers.get('authorization') === `Bearer ${secreto}`
  if (!esCron) {
    const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
    if (guard) return guard
  }

  try {
    const cdr = await sincronizarCdrPendientes()
    return NextResponse.json({ cdr })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : 'Error desconocido al sincronizar los CDR'
    return NextResponse.json({ error: mensaje }, { status: 502 })
  }
}
