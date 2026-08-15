import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard

  const esteticistas = await prisma.user.findMany({
    where: { role: 'ESTETICISTA' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(esteticistas)
}
