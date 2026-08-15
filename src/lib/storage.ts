import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

// TODO: este almacenamiento local solo sirve para un único servidor/instancia y no
// sobrevive a un redeploy en la mayoría de hostings. Antes de llevar esto a producción,
// migrar a un storage externo (S3 o UploadThing) detrás de esta misma interfaz.
//
// Sugerencia: Amazon S3. La base de datos ya vive en AWS RDS, así que S3 comparte
// región/VPC/credenciales y evita agregar un proveedor nuevo; con URLs firmadas o
// CloudFront se sirven las fotos de forma privada y es más barato a volumen (fotos de
// evolución de tratamientos se acumulan por años, por cliente). UploadThing es más
// rápido de integrar (SDK propio para Next.js, sin configurar buckets/IAM) y puede
// convenir si se prioriza velocidad de desarrollo sobre costo/control a largo plazo.

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'atenciones')
const UPLOAD_ROOT_PRODUCTOS = path.join(process.cwd(), 'public', 'uploads', 'productos')

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
}

export const TIPOS_IMAGEN_PERMITIDOS = Object.keys(EXTENSION_BY_MIME)
export const TAMANO_MAXIMO_FOTO = 8 * 1024 * 1024 // 8 MB

export async function guardarFotoAtencion(atencionId: string, file: File): Promise<string> {
  const extension = EXTENSION_BY_MIME[file.type]
  if (!extension) {
    throw new Error('TIPO_NO_SOPORTADO')
  }
  if (file.size > TAMANO_MAXIMO_FOTO) {
    throw new Error('ARCHIVO_MUY_GRANDE')
  }

  const dir = path.join(UPLOAD_ROOT, atencionId)
  await mkdir(dir, { recursive: true })

  const filename = `${randomUUID()}${extension}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, filename), buffer)

  return `/uploads/atenciones/${atencionId}/${filename}`
}

export async function guardarFotoProducto(productoId: string, file: File): Promise<string> {
  const extension = EXTENSION_BY_MIME[file.type]
  if (!extension) {
    throw new Error('TIPO_NO_SOPORTADO')
  }
  if (file.size > TAMANO_MAXIMO_FOTO) {
    throw new Error('ARCHIVO_MUY_GRANDE')
  }

  const dir = path.join(UPLOAD_ROOT_PRODUCTOS, productoId)
  await mkdir(dir, { recursive: true })

  const filename = `${randomUUID()}${extension}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, filename), buffer)

  return `/uploads/productos/${productoId}/${filename}`
}
