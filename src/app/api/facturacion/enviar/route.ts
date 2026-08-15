import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard

  // TODO: Implementar el envío y la respuesta de SUNAT/OSE/PSE según el proveedor elegido.
  return NextResponse.json({
    ok: false,
    error: 'Envío a SUNAT pendiente de integración con el proveedor externo',
  }, { status: 501 })
}
