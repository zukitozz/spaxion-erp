'use client'

import { useEffect, useState } from 'react'

interface Settings {
  nombreEmpresa: string
  googleCalendarActivo: boolean
  googleCalendarId: string | null
  facturacionEndpoint: string | null
  facturacionActivo: boolean
}

const initialSettings: Settings = {
  nombreEmpresa: 'Spaxión Centro Estético',
  googleCalendarActivo: false,
  googleCalendarId: '',
  facturacionEndpoint: '',
  facturacionActivo: false,
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
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="card-surface">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-700/80">Ajustes</p>
          <h1 className="mt-3 text-3xl font-semibold text-emerald-900">Configuración de integración</h1>
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
