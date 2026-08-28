import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

const BUCKET = process.env.AWS_S3_BUCKET || ''
// 12 horas: alcanza para una jornada de trabajo sin que la URL expire mientras la pantalla sigue abierta.
const URL_EXPIRACION_SEGUNDOS = 60 * 60 * 12

// Credenciales explícitas: si la máquina tiene AWS_PROFILE configurado (común en equipos
// de desarrollo con AWS CLI/CDK), el SDK lo prioriza por defecto sobre estas variables y
// terminaría usando credenciales de otro usuario/rol. Pasarlas a mano evita esa sorpresa.
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
}

export const TIPOS_IMAGEN_PERMITIDOS = Object.keys(EXTENSION_BY_MIME)
export const TAMANO_MAXIMO_FOTO = 8 * 1024 * 1024 // 8 MB

async function subirFoto(prefix: string, file: File): Promise<string> {
  const extension = EXTENSION_BY_MIME[file.type]
  if (!extension) {
    throw new Error('TIPO_NO_SOPORTADO')
  }
  if (file.size > TAMANO_MAXIMO_FOTO) {
    throw new Error('ARCHIVO_MUY_GRANDE')
  }

  const key = `${prefix}/${randomUUID()}${extension}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: file.type }))

  return key
}

// Devuelve la key de S3 (no una URL): el bucket es privado y las lecturas se sirven
// siempre con urlFirmada() para no exponer fotos de clientes/tratamientos públicamente.
export async function guardarFotoAtencion(atencionId: string, file: File): Promise<string> {
  return subirFoto(`atenciones/${atencionId}`, file)
}

export async function guardarFotoProducto(productoId: string, file: File): Promise<string> {
  return subirFoto(`productos/${productoId}`, file)
}

export async function urlFirmada(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: URL_EXPIRACION_SEGUNDOS })
}

export async function presignarProducto<T extends { imagenUrl: string | null }>(producto: T): Promise<T> {
  if (!producto.imagenUrl) return producto
  return { ...producto, imagenUrl: await urlFirmada(producto.imagenUrl) }
}

export async function presignarProductos<T extends { imagenUrl: string | null }>(productos: T[]): Promise<T[]> {
  return Promise.all(productos.map(presignarProducto))
}
