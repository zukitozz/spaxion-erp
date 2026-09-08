'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface ConfiguracionState {
  usaCabinas: boolean
  loading: boolean
}

const ConfiguracionContext = createContext<ConfiguracionState>({ usaCabinas: true, loading: true })

export function ConfiguracionProvider({ children }: { readonly children: React.ReactNode }) {
  const [state, setState] = useState<ConfiguracionState>({ usaCabinas: true, loading: true })

  useEffect(() => {
    let vigente = true
    fetch('/api/ajustes')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!vigente) return
        setState({ usaCabinas: data ? Boolean(data.usaCabinas) : true, loading: false })
      })
      .catch(() => {
        if (vigente) setState((prev) => ({ ...prev, loading: false }))
      })
    return () => {
      vigente = false
    }
  }, [])

  return <ConfiguracionContext.Provider value={state}>{children}</ConfiguracionContext.Provider>
}

export function useConfiguracion() {
  return useContext(ConfiguracionContext)
}
