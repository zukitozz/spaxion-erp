'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/Toast'

interface Foto {
  id: string
  url: string
  descripcion: string | null
  creadoAt: string
}

interface AtencionFotosProps {
  atencionId: string
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function AtencionFotos({ atencionId }: AtencionFotosProps) {
  const toast = useToast()
  const [fotos, setFotos] = useState<Foto[]>([])
  const [descripcion, setDescripcion] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  const cargarFotos = () => {
    fetch(`/api/atenciones/${atencionId}/fotos`)
      .then((res) => res.json())
      .then((data) => setFotos(Array.isArray(data) ? data : []))
  }

  useEffect(() => {
    cargarFotos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atencionId])

  const subirFoto = async (file: File) => {
    setSubiendo(true)
    setError('')
    const body = new FormData()
    body.append('file', file)
    if (descripcion) body.append('descripcion', descripcion)
    const response = await fetch(`/api/atenciones/${atencionId}/fotos`, { method: 'POST', body })
    setSubiendo(false)
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'No se pudo subir la foto')
      return
    }
    setDescripcion('')
    cargarFotos()
    toast.success('Foto guardada')
  }

  return (
    <div className="rounded-3xl border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-700">Fotos de seguimiento</p>
      <p className="text-xs text-slate-500">Se guarda automáticamente la fecha en que se tomó cada foto para llevar el control de evolución.</p>
      {error && <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        {fotos.map((foto) => (
          <a key={foto.id} href={foto.url} target="_blank" rel="noreferrer" className="block text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.url} alt={formatearFecha(foto.creadoAt)} className="h-20 w-20 rounded-2xl border border-slate-200 object-cover" />
            <span className="mt-1 block text-[11px] text-slate-500">{formatearFecha(foto.creadoAt)}</span>
          </a>
        ))}
        {fotos.length === 0 && <p className="text-sm text-slate-500">Aún no hay fotos registradas para esta sesión.</p>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Nota opcional (ej. zona tratada)"
          className="field !mt-0 !w-auto min-w-[12rem]"
        />
        <label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          {subiendo ? 'Subiendo...' : 'Subir foto'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            disabled={subiendo}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void subirFoto(file)
              e.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}
