import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/api-auth'
import { guardarFotoProducto, presignarProducto } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireApiAuth(['SUPERVISOR'])
  if (guard) return guard

  const producto = await prisma.producto.findUnique({ where: { id: params.id } })
  if (!producto) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  }

  try {
    const key = await guardarFotoProducto(producto.id, file)
    const actualizado = await prisma.producto.update({
      where: { id: producto.id },
      data: { imagenUrl: key },
    })
    return NextResponse.json(await presignarProducto(actualizado))
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
