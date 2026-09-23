import { NextRequest, NextResponse } from 'next/server'
import { uploadImage } from '@/lib/cloudinary'

// Recibe una foto (FormData, campo "file") y la sube a Cloudinary, devuelve
// { url }. Protegido por el middleware de auth igual que el resto de /api.
// Usado por PhotoInput — productos en Pedidos y ofertas en Tienda.
export async function POST(req: NextRequest) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el archivo' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: 'Archivo no recibido' }, { status: 400 })
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: 'La imagen es muy grande (máx 15MB)' }, { status: 400 })
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return NextResponse.json(
      { error: 'Almacenamiento de fotos no configurado (faltan variables de Cloudinary)' },
      { status: 500 }
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await uploadImage(buffer)
    return NextResponse.json({ url })
  } catch (e) {
    console.error('Error subiendo foto a Cloudinary', e)
    return NextResponse.json({ error: 'No se pudo subir la foto' }, { status: 500 })
  }
}
