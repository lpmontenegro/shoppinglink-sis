'use client'

import { useEffect, useState } from 'react'

// Input de dinero: mientras no tiene foco muestra el valor formateado con
// separador de miles y símbolo de moneda (ej. "Q 1,500.00"); al enfocarse
// muestra el número crudo para editar fácil. El valor que entra/sale por
// value/onChange siempre es un string numérico plano ("1500.5"), nunca el
// texto formateado.
export default function MoneyInput({
  value,
  onChange,
  prefix = 'Q',
  placeholder,
  required,
}: {
  value: string
  onChange: (v: string) => void
  prefix?: string
  placeholder?: string
  required?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const [rawText, setRawText] = useState(value)

  useEffect(() => {
    if (!focused) setRawText(value)
  }, [value, focused])

  function formatDisplay(v: string) {
    const n = parseFloat(v)
    if (!Number.isFinite(n)) return ''
    return n.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-dk text-sm pointer-events-none">
        {prefix}
      </span>
      <input
        required={required}
        type="text"
        inputMode="decimal"
        placeholder={placeholder}
        value={focused ? rawText : formatDisplay(value) || rawText}
        onFocus={() => {
          setFocused(true)
          setRawText(value)
        }}
        onChange={(e) => {
          // Solo dígitos y un punto decimal.
          let raw = e.target.value.replace(/[^0-9.]/g, '')
          const firstDot = raw.indexOf('.')
          if (firstDot !== -1) {
            raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '')
          }
          setRawText(raw)
          onChange(raw)
        }}
        onBlur={() => setFocused(false)}
        className="w-full pl-8 pr-3 py-2 border border-brand-gray rounded"
      />
    </div>
  )
}
