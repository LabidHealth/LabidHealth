/**
 * Compresses an image file using the browser Canvas API before upload.
 * Target: output < 200 KB, max dimension 1024 px.
 *
 * Returns a new File with the same name but potentially reduced size.
 */
export async function compressImage(
  file: File,
  maxDimension = 1024,
  targetBytes = 200_000,
  quality = 0.82
): Promise<File> {
  // Only process raster images
  if (!file.type.startsWith('image/')) return file

  const bitmap = await createImageBitmap(file)

  // Determine target dimensions
  const { width: origW, height: origH } = bitmap
  let w = origW
  let h = origH
  if (w > maxDimension || h > maxDimension) {
    const ratio = Math.min(maxDimension / w, maxDimension / h)
    w = Math.round(w * ratio)
    h = Math.round(h * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  // Iteratively reduce quality until we're under the target size
  let currentQuality = quality
  let blob: Blob | null = null
  for (let attempt = 0; attempt < 6; attempt++) {
    blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, 'image/jpeg', currentQuality)
    )
    if (!blob || blob.size <= targetBytes) break
    currentQuality -= 0.1
    if (currentQuality < 0.3) break
  }

  if (!blob) return file
  const ext = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], ext, { type: 'image/jpeg', lastModified: Date.now() })
}
