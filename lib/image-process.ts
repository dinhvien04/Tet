/**
 * Server-side image validation & sanitization via sharp.
 * - Real pixel limits (not byte length)
 * - Auto-rotate + strip EXIF/metadata via re-encode
 * - Reject decompression bombs / oversized frames
 */

import sharp from 'sharp'

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_PIXELS = 40_000_000
export const MAX_DIMENSION = 16_384
/** Animated formats: only first frame accepted (pages/delay frames). */
export const MAX_PAGES = 1

export type SafeImageMime = 'image/jpeg' | 'image/png' | 'image/webp'

/** sharp Metadata without relying on `sharp` namespace (types differ across versions). */
type ImageMetadata = Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>

export class ImageProcessError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ImageProcessError'
    this.status = status
  }
}

export interface ProcessedImage {
  buffer: Buffer
  mime: SafeImageMime
  width: number
  height: number
  format: string
}

/**
 * Decode, validate dimensions/pixels, auto-rotate, strip metadata, re-encode.
 */
export async function processUploadImage(
  input: Buffer,
  magicMime: string
): Promise<ProcessedImage> {
  if (!input?.length) {
    throw new ImageProcessError('File ảnh rỗng')
  }

  if (input.length > MAX_UPLOAD_BYTES) {
    throw new ImageProcessError('File quá lớn. Kích thước tối đa 10MB.')
  }

  // HEIC: only accept if sharp/libvips can actually decode
  if (magicMime === 'image/heic') {
    return processHeic(input)
  }

  let pipeline = sharp(input, {
    failOn: 'error',
    limitInputPixels: MAX_PIXELS,
    animated: false,
  })

  let meta: ImageMetadata
  try {
    meta = await pipeline.metadata()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'decode failed'
    if (/heif|heic|unsupported/i.test(msg)) {
      throw new ImageProcessError(
        'Định dạng HEIC/HEIF không được hỗ trợ trên server. Vui lòng chuyển sang JPG hoặc PNG.'
      )
    }
    throw new ImageProcessError('Không thể đọc ảnh. File có thể bị hỏng hoặc không phải ảnh hợp lệ.')
  }

  validateMetadata(meta)

  // Rebuild pipeline after metadata (sharp pipelines are single-use after some ops)
  pipeline = sharp(input, {
    failOn: 'error',
    limitInputPixels: MAX_PIXELS,
    animated: false,
    pages: 1,
  }).rotate() // auto-orient from EXIF, then strip

  const hasAlpha = Boolean(meta.hasAlpha)
  const preferPng = hasAlpha && (meta.format === 'png' || meta.format === 'webp')

  try {
    if (preferPng) {
      const buffer = await pipeline.png({ compressionLevel: 8, effort: 4 }).toBuffer()
      const outMeta = await sharp(buffer).metadata()
      return {
        buffer,
        mime: 'image/png',
        width: outMeta.width ?? meta.width!,
        height: outMeta.height ?? meta.height!,
        format: 'png',
      }
    }

    const buffer = await pipeline
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()
    const outMeta = await sharp(buffer).metadata()
    return {
      buffer,
      mime: 'image/jpeg',
      width: outMeta.width ?? meta.width!,
      height: outMeta.height ?? meta.height!,
      format: 'jpeg',
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (/Input image exceeds pixel limit|pixel limit/i.test(msg)) {
      throw new ImageProcessError('Ảnh vượt giới hạn số pixel cho phép')
    }
    throw new ImageProcessError('Không thể xử lý ảnh. Vui lòng thử file khác.')
  }
}

async function processHeic(input: Buffer): Promise<ProcessedImage> {
  try {
    const pipeline = sharp(input, {
      failOn: 'error',
      limitInputPixels: MAX_PIXELS,
    })
    const meta = await pipeline.metadata()
    validateMetadata(meta)

    const buffer = await sharp(input, {
      failOn: 'error',
      limitInputPixels: MAX_PIXELS,
    })
      .rotate()
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()

    const outMeta = await sharp(buffer).metadata()
    return {
      buffer,
      mime: 'image/jpeg',
      width: outMeta.width ?? meta.width!,
      height: outMeta.height ?? meta.height!,
      format: 'jpeg',
    }
  } catch (err) {
    if (err instanceof ImageProcessError) throw err
    throw new ImageProcessError(
      'HEIC không được hỗ trợ trên server này. Vui lòng chuyển sang JPG hoặc PNG.',
      400
    )
  }
}

function validateMetadata(meta: ImageMetadata): void {
  const width = meta.width
  const height = meta.height

  if (!width || !height || width < 1 || height < 1) {
    throw new ImageProcessError('Không đọc được kích thước ảnh')
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new ImageProcessError(
      `Cạnh ảnh tối đa ${MAX_DIMENSION}px (nhận ${width}×${height})`
    )
  }

  const pixels = width * height
  if (pixels > MAX_PIXELS) {
    throw new ImageProcessError(
      `Ảnh vượt giới hạn pixel (${pixels.toLocaleString()} > ${MAX_PIXELS.toLocaleString()})`
    )
  }

  // Animated / multi-page
  const pages = meta.pages ?? 1
  if (pages > MAX_PAGES) {
    throw new ImageProcessError(
      `Ảnh động/nhiều frame không được hỗ trợ (frames: ${pages})`
    )
  }
}

/**
 * Detect image MIME from magic bytes (no trust client Content-Type).
 */
export function detectMimeFromMagic(buffer: Buffer): string | null {
  if (buffer.length < 12) return null

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12).toLowerCase()
    if (['heic', 'heif', 'mif1', 'msf1'].some((b) => brand.includes(b.slice(0, 3)))) {
      return 'image/heic'
    }
  }

  return null
}
