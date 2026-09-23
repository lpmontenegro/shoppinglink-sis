import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

// Arma una carpeta segura dentro de "shoppinglink/" a partir de lo que
// mande el cliente (ej. código de ciclo + área: "2026-10/pedidos") — así las
// fotos quedan organizadas por ciclo en Cloudinary y se pueden limpiar por
// carpeta si algún ciclo ya no se necesita. Solo se permiten letras,
// números, guiones y "/", y se ignora cualquier intento de salir de la
// carpeta base (.., rutas absolutas, etc.).
export function safeUploadFolder(requested?: string | null): string {
  const base = 'shoppinglink'
  if (!requested) return `${base}/sin-ciclo`
  const segments = requested
    .split('/')
    .map((s) => s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40))
    .filter((s) => s.length > 0 && s !== '.' && s !== '..')
    .slice(0, 4)
  if (segments.length === 0) return `${base}/sin-ciclo`
  return `${base}/${segments.join('/')}`
}

// Sube un buffer de imagen a Cloudinary y devuelve la URL pública (https).
// Se usa desde /api/upload — las fotos de productos (Pedidos) y de ofertas
// de tienda pasan por aquí.
export function uploadImage(buffer: Buffer, folder = 'shoppinglink/sin-ciclo'): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary: sin resultado'))
        resolve(result.secure_url)
      }
    )
    stream.end(buffer)
  })
}

export { cloudinary }
