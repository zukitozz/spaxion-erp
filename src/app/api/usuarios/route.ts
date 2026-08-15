import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const guard = await requireApiAuth(['ADMIN'])
  if (guard) return guard

  const body = await req.json()
  if (!body.name || !body.email || !body.password) {
    return NextResponse.json({ error: 'Nombre, correo y contraseña requeridos' }, { status: 400 })
  }

  const password = await bcrypt.hash(String(body.password), 12)
  const user = await prisma.user.create({
    data: {
      name: String(body.name),
      email: String(body.email).toLowerCase().trim(),
      password,
      role: body.role || 'OPERADOR',
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}

export async function DELETE(req: Request) {
  const guard = await requireApiAuth(['ADMIN'])
  if (guard) return guard

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}