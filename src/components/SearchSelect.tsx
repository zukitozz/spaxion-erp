'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type SearchSelectOption = {
  value: string
  label: string
  group?: string
}

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SearchSelectOption[]
  placeholder: string
  ariaLabel?: string
  className?: string
}

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function SearchSelect({ id, value, onChange, options, placeholder, ariaLabel, className = 'field mt-2 bg-white' }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [consulta, setConsulta] = useState('')
  const [activo, setActivo] = useState(0)
  const contenedorRef = useRef<HTMLDivElement>(null)

  const seleccionada = options.find((option) => option.value === value)

  const filtradas = useMemo(() => {
    const terminos = normalizar(consulta).split(/\s+/).filter(Boolean)
    if (terminos.length === 0) return options
    return options.filter((option) => {
      const etiqueta = normalizar(option.label)
      return terminos.every((termino) => etiqueta.includes(termino))
    })
  }, [options, consulta])

  useEffect(() => {
    if (!abierto) return
    function cerrarAlHacerClicFuera(event: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false)
        setConsulta('')
      }
    }
    document.addEventListener('mousedown', cerrarAlHacerClicFuera)
    return () => document.removeEventListener('mousedown', cerrarAlHacerClicFuera)
  }, [abierto])

  function elegir(nuevoValor: string) {
    onChange(nuevoValor)
    setAbierto(false)
    setConsulta('')
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setAbierto(true)
      setActivo((prev) => Math.min(prev + 1, filtradas.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActivo((prev) => Math.max(prev - 1, 0))
    } else if (event.key === 'Enter' && abierto) {
      event.preventDefault()
      const opcion = filtradas[activo]
      if (opcion) elegir(opcion.value)
    } else if (event.key === 'Escape') {
      setAbierto(false)
      setConsulta('')
    }
  }

  let grupoActual: string | undefined

  return (
    <div ref={contenedorRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={abierto}
        autoComplete="off"
        value={abierto ? consulta : seleccionada?.label ?? ''}
        placeholder={abierto && seleccionada ? seleccionada.label : placeholder}
        onFocus={() => { setAbierto(true); setActivo(0) }}
        onClick={() => setAbierto(true)}
        onChange={(event) => { setConsulta(event.target.value); setAbierto(true); setActivo(0) }}
        onKeyDown={onKeyDown}
        className={className}
      />
      {abierto && (
        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg" role="listbox">
          <li>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => elegir('')}
              className="block w-full px-3 py-2 text-left text-sm italic text-slate-500 hover:bg-slate-50"
            >
              {placeholder}
            </button>
          </li>
          {filtradas.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Sin resultados</li>}
          {filtradas.map((option, index) => {
            const mostrarGrupo = option.group && option.group !== grupoActual
            grupoActual = option.group
            return (
              <li key={option.value} role="option" aria-selected={option.value === value}>
                {mostrarGrupo && <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-slate-400">{option.group}</p>}
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => elegir(option.value)}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 ${index === activo ? 'bg-emerald-50' : ''} ${option.value === value ? 'font-semibold text-emerald-800' : 'text-slate-700'}`}
                >
                  {option.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
