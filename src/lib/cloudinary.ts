import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

// Sube un buffer de imagen a Cloudinary y devuelve la URL pública (https).
// Se usa desde /api/upload — las fotos de productos (Pedidos) y de ofertas
// de tienda pasan por aquí.
export function uploadImage(buffer: Buffer, folder = 'shoppinglink'): Promise<string> {
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
