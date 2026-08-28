import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  await prisma.configuracion.upsert({
    where: { id: 'default' },
    update: { googleRefreshTokenEnc: null, googleCuentaEmail: null, googleSyncToken: null },
    create: { id: 'default' },
  })

  return NextResponse.json({ success: true })
}
