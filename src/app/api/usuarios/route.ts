import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

const select = { id: true, name: true, email: true, role: true, celular1: true, celular2: true, createdAt: true }

export async function GET() {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const users = await prisma.user.findMany({
    select,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const body = await req.json()
  if (!body.name || !body.email || !body.password) {
    return NextResponse.json({ error: 'Nombre, correo y contraseña requeridos' }, { status: 400 })
  }
  if (body.role === 'SUPERVISOR') {
    return NextResponse.json({ error: 'No se pueden crear más usuarios Supervisor' }, { status: 400 })
  }

  try {
    const password = await bcrypt.hash(String(body.password), 12)
    const user = await prisma.user.create({
      data: {
        name: String(body.name),
        email: String(body.email).toLowerCase().trim(),
        password,
        role: body.role || 'ESTETICISTA',
        celular1: (body.celular1 as string) || null,
        celular2: (body.celular2 as string) || null,
      },
      select,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Ese correo ya está registrado' }, { status: 409 })
    }
    throw error
  }
}

export async function PUT(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const body = await req.json()
  if (!body.id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }
  if (!body.name || !body.email) {
    return NextResponse.json({ error: 'Nombre y correo requeridos' }, { status: 400 })
  }
  if (body.role === 'SUPERVISOR') {
    const existente = await prisma.user.findUnique({ where: { id: body.id }, select: { role: true } })
    if (existente?.role !== 'SUPERVISOR') {
      return NextResponse.json({ error: 'No se pueden crear más usuarios Supervisor' }, { status: 400 })
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id: body.id },
      data: {
        name: String(body.name),
        email: String(body.email).toLowerCase().trim(),
        role: body.role || 'ESTETICISTA',
        celular1: (body.celular1 as string) || null,
        celular2: (body.celular2 as string) || null,
        ...(body.password ? { password: await bcrypt.hash(String(body.password), 12) } : {}),
      },
      select,
    })

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Ese correo ya está registrado' }, { status: 409 })
    }
    throw error
  }
}

export async function DELETE(req: Request) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
