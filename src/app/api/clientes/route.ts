import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiAuth()
  if (guard) return guard
  const clientes = await prisma.cliente.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(clientes)
}

function clienteData(body: Record<string, unknown>) {
  return {
    nombre: body.nombre as string,
    dni: (body.dni as string) || null,
    ruc: (body.ruc as string) || null,
    carnetExtranjeria: (body.carnetExtranjeria as string) || null,
    razonSocial: (body.razonSocial as string) || null,
    celular: (body.celular as string) || null,
    distrito: (body.distrito as string) || null,
    email: (body.email as string) || null,
    fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento as string) : null,
    peso: body.peso ? Number(body.peso) : null,
    edad: body.edad ? Number(body.edad) : null,
    altura: body.altura ? Number(body.altura) : null,
    notas: (body.notas as string) || null,
  }
}

export async function POST(req: Request) {
  const guard = await requireApiAuth()
  if (guard) return guard
  const body = await req.json()

  const dni = typeof body.dni === 'string' ? body.dni.trim() : ''
  if (dni) {
    const clienteExistente = await prisma.cliente.findUnique({ where: { dni } })
    if (clienteExistente) {
      return NextResponse.json({ error: 'El DNI ya está registrado en otro cliente' }, { status: 409 })
    }
  }

  try {
    const cliente = await prisma.cliente.create({ data: clienteData(body) })
    return NextResponse.json(cliente, { status: 201 })
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Ese DNI, RUC o Carnet de Extranjería ya está registrado en otro cliente' }, { status: 409 })
    }
    throw error
  }
}

export async function PUT(req: Request) {
  const guard = await requireApiAuth()
  if (guard) return guard
  const body = await req.json()

  if (!body.id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  try {
    const updated = await prisma.cliente.update({
      where: { id: body.id },
      data: clienteData(body),
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Ese DNI, RUC o Carnet de Extranjería ya está registrado en otro cliente' }, { status: 409 })
    }
    throw error
  }
}

export async function DELETE(req: Request) {
  const guard = await requireApiAuth(['ADMIN', 'SUPERVISOR'])
  if (guard) return guard
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  await prisma.cliente.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
