'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/Toast'

interface Settings {
  nombreEmpresa: string
  ruc: string | null
  razonSocial: string | null
  direccionFiscal: string | null
  codigoUbigeo: string | null
  googleCalendarActivo: boolean
  googleCalendarId: string | null
  googleCuentaEmail: string | null
  facturacionEndpoint: string | null
  facturacionActivo: boolean
  horasExpiracionCita: number
  usaCabinas: boolean
}

const initialSettings: Settings = {
  nombreEmpresa: 'Spaxión Centro Estético',
  ruc: '',
  razonSocial: '',
  direccionFiscal: '',
  codigoUbigeo: '',
  googleCalendarActivo: false,
  googleCalendarId: '',
  googleCuentaEmail: null,
  facturacionEndpoint: '',
  facturacionActivo: false,
  horasExpiracionCita: 24,
  usaCabinas: true,
}

export default function AjustesPage() {
  const toast = useToast()
  const [settings, setSettings] = useState(initialSettings)

  useEffect(() => {
    fetch('/api/ajustes').then((response) => response.json()).then((data) => setSettings(data))
    const calendarResult = new URLSearchParams(window.location.search).get('calendar')
    if (calendarResult === 'ok') toast.success('Cuenta de Google conectada correctamente.')
    if (calendarResult === 'error') toast.error('No se pudo conectar la cuenta de Google. Verifica las credenciales OAuth.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    const response = await fetch('/api/ajustes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (response.ok) {
      toast.success('Configuración guardada')
    } else {
      toast.error('No tienes permisos para guardar ajustes.')
    }
  }

  const disconnectGoogle = async () => {
    const response = await fetch('/api/integraciones/google-calendar/disconnect', { method: 'POST' })
    if (response.ok) {
      setSettings((prev) => ({ ...prev, googleCuentaEmail: null }))
      toast.success('Cuenta de Google desconectada.')
    } else {
      toast.error('No se pudo desconectar la cuenta de Google.')
    }
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
            <label htmlFor="razon-social" className="text-sm font-medium text-slate-700">Razón social</label>
            <input id="razon-social" value={settings.razonSocial || ''} onChange={(e) => setSettings({ ...settings, razonSocial: e.target.value })} className="field" />
            <label htmlFor="ruc" className="text-sm font-medium text-slate-700">RUC</label>
            <input id="ruc" value={settings.ruc || ''} onChange={(e) => setSettings({ ...settings, ruc: e.target.value })} className="field" maxLength={11} placeholder="11 dígitos" />
            <label htmlFor="direccion-fiscal" className="text-sm font-medium text-slate-700">Dirección fiscal</label>
            <input id="direccion-fiscal" value={settings.direccionFiscal || ''} onChange={(e) => setSettings({ ...settings, direccionFiscal: e.target.value })} className="field" />
            <label htmlFor="codigo-ubigeo" className="text-sm font-medium text-slate-700">Código de ubigeo</label>
            <input id="codigo-ubigeo" value={settings.codigoUbigeo || ''} onChange={(e) => setSettings({ ...settings, codigoUbigeo: e.target.value })} className="field" placeholder="Ej. 150101" />
          </div>
          <div className="card-surface space-y-4">
            <h2 className="text-xl font-semibold text-emerald-900">Google Calendar</h2>
            {settings.googleCuentaEmail ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#dfe8e0] bg-[#ecf8f2] px-4 py-3">
                <p className="text-sm text-[#1d6f50]">Conectado como <strong>{settings.googleCuentaEmail}</strong></p>
                <button type="button" onClick={() => void disconnectGoogle()} className="text-xs font-bold text-[#b3403a]">Desconectar</button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Conecta una cuenta de Google para sincronizar citas con Calendar en ambos sentidos.</p>
                <a href="/api/integraciones/google-calendar/connect" className="btn-brand inline-block">Conectar con Google</a>
              </div>
            )}
            <label htmlFor="calendar-id" className="text-sm font-medium text-slate-700">ID del calendario</label>
            <input id="calendar-id" value={settings.googleCalendarId || ''} onChange={(e) => setSettings({ ...settings, googleCalendarId: e.target.value })} className="field" placeholder="correo o ID del calendario (vacío = calendario principal)" />
            <label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" checked={settings.googleCalendarActivo} onChange={(e) => setSettings({ ...settings, googleCalendarActivo: e.target.checked })} /> Activar sincronización</label>
          </div>
          <div className="card-surface space-y-4">
            <h2 className="text-xl font-semibold text-emerald-900">Cabinas físicas</h2>
            <p className="text-sm text-slate-600">Actívalo solo si el local cuenta con cabinas físicas que deben reservarse para cada atención. Si está apagado, las atenciones se registran directamente sobre el paciente.</p>
            <label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" checked={settings.usaCabinas} onChange={(e) => setSettings({ ...settings, usaCabinas: e.target.checked })} /> Usar cabinas físicas</label>
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
      </div>
    </div>
  )
}
