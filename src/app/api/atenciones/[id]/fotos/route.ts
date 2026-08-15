import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { guardarFotoAtencion } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const ROLES_ATENCION = ['ADMIN', 'SUPERVISOR', 'OPERADOR', 'ESTETICISTA'] as const

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth()
  if (guard) return guard

  const fotos = await prisma.atencionFoto.findMany({
    where: { atencionId: params.id },
    orderBy: { creadoAt: 'asc' },
  })

  return NextResponse.json(fotos)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth([...ROLES_ATENCION])
  if (guard) return guard

  const atencion = await prisma.atencionCabina.findUnique({ where: { id: params.id } })
  if (!atencion) {
    return NextResponse.json({ error: 'Atención no encontrada' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  const descripcion = formData.get('descripcion')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  }

  try {
    const url = await guardarFotoAtencion(atencion.id, file)
    const foto = await prisma.atencionFoto.create({
      data: {
        atencionId: atencion.id,
        url,
        descripcion: typeof descripcion === 'string' && descripcion ? descripcion : null,
      },
    })
    return NextResponse.json(foto, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'TIPO_NO_SOPORTADO') {
      return NextResponse.json({ error: 'Formato de imagen no soportado (usa JPG, PNG, WEBP o HEIC)' }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'ARCHIVO_MUY_GRANDE') {
      return NextResponse.json({ error: 'La imagen supera el tamaño máximo permitido (8MB)' }, { status: 400 })
    }
    throw error
  }
}
