'use client'

import { useEffect, useState } from 'react'

// Miniatura de producto que abre la foto en grande en una ventana emergente
// (overlay), en vez de mandar a otra pestaña — se cierra con Escape, con el
// botón de cerrar, o tocando fuera de la foto. Se usa en Pedidos, Empaque y
// Distribución para que sea fácil identificar el producto sin perder la
// navegación de la página.
export default function PhotoThumb({ src, size = 'w-8 h-8' }: { src: string; size?: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        title="Ver foto en tamaño grande"
        className={`${size} shrink-0 rounded overflow-hidden border border-brand-gray hover:opacity-80`}
      >
        <img src={src} alt="" className="w-full h-full object-cover" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white text-3xl leading-none rounded-full hover:bg-white/10"
          >
            &times;
          </button>
          <img
            src={src}
            alt=""
            className="max-w-full max-h-full rounded shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
