'use client'

import { useEffect, useState } from 'react'

interface Settings {
  nombreEmpresa: string
  googleCalendarActivo: boolean
  googleCalendarId: string | null
  facturacionEndpoint: string | null
  facturacionActivo: boolean
  horasExpiracionCita: number
}

const initialSettings: Settings = {
  nombreEmpresa: 'Spaxión Centro Estético',
  googleCalendarActivo: false,
  googleCalendarId: '',
  facturacionEndpoint: '',
  facturacionActivo: false,
  horasExpiracionCita: 24,
}

export default function AjustesPage() {
  const [settings, setSettings] = useState(initialSettings)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/ajustes').then((response) => response.json()).then((data) => setSettings(data))
  }, [])

  const save = async () => {
    const response = await fetch('/api/ajustes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setMessage(response.ok ? 'Configuración guardada.' : 'No tienes permisos para guardar ajustes.')
  }

  return (
    <div className="page-shell px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="eyebrow">Ajustes</p>
          <h1 className="mt-3 page-heading text-3xl">Configuración de integración</h1>
          <p className="mt-2 text-slate-600">Guarda la configuración operativa de la empresa y sus servicios externos.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-surface space-y-4">
            <h2 className="text-xl font-semibold text-emerald-900">Empresa</h2>
            <label htmlFor="nombre-empresa" className="text-sm font-medium text-slate-700">Nombre comercial</label>
            <input id="nombre-empresa" value={settings.nombreEmpresa} onChange={(e) => setSettings({ ...settings, nombreEmpresa: e.target.value })} className="field" />
          </div>
          <div className="card-surface space-y-4">
            <h2 className="text-xl font-semibold text-emerald-900">Google Calendar</h2>
            <p className="text-sm text-slate-600">La conexión OAuth requiere Client ID y Client Secret de Google Cloud.</p>
            <label htmlFor="calendar-id" className="text-sm font-medium text-slate-700">ID del calendario</label>
            <input id="calendar-id" value={settings.googleCalendarId || ''} onChange={(e) => setSettings({ ...settings, googleCalendarId: e.target.value })} className="field" placeholder="correo o ID del calendario" />
            <label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" checked={settings.googleCalendarActivo} onChange={(e) => setSettings({ ...settings, googleCalendarActivo: e.target.checked })} /> Activar sincronización</label>
          </div>
          <div className="card-surface space-y-4">
            <h2 className="text-xl font-semibold text-emerald-900">Vigencia de citas</h2>
            <p className="text-sm text-slate-600">Después de este plazo una cita pendiente se marca como expirada y no puede registrarse en una cabina.</p>
            <label htmlFor="horas-expiracion-cita" className="text-sm font-medium text-slate-700">Horas después de la cita</label>
            <input id="horas-expiracion-cita" type="number" min={1} value={settings.horasExpiracionCita} onChange={(e) => setSettings({ ...settings, horasExpiracionCita: Math.max(1, Number(e.target.value) || 1) })} className="field" />
          </div>
          <div className="card-surface space-y-4">
            <h2 className="text-xl font-semibold text-emerald-900">Proveedor de facturación</h2>
            <p className="text-sm text-slate-600">Configura aquí el endpoint de SUNAT/OSE/PSE que recibirá el comprobante.</p>
            <label htmlFor="facturacion-endpoint" className="text-sm font-medium text-slate-700">Endpoint API</label>
            <input id="facturacion-endpoint" value={settings.facturacionEndpoint || ''} onChange={(e) => setSettings({ ...settings, facturacionEndpoint: e.target.value })} className="field" placeholder="https://api.proveedor.pe/comprobantes" />
            <label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" checked={settings.facturacionActivo} onChange={(e) => setSettings({ ...settings, facturacionActivo: e.target.checked })} /> Activar envío externo</label>
          </div>
        </div>
        <button type="button" onClick={() => void save()} className="btn-brand">Guardar ajustes</button>
        {message && <p className="text-sm text-slate-600">{message}</p>}
      </div>
    </div>
  )
}
