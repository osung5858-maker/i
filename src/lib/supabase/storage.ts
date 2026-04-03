import { createClient } from '@/lib/supabase/client'

const BUCKET = 'ultrasound'
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 30 * 1024 * 1024 // 30MB
const RESIZE_MAX_WIDTH = 1200
const SIGNED_URL_EXPIRY = 3600 // 1 hour

/** Resize image client-side to max 1200px width, return as Blob */
async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width <= RESIZE_MAX_WIDTH) {
        resolve(file)
        return
      }
      const ratio = RESIZE_MAX_WIDTH / width
      width = RESIZE_MAX_WIDTH
      height = Math.round(height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Failed to resize')),
        'image/jpeg',
        0.85
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

/** Upload an ultrasound image (JPEG/PNG). Returns storage path. */
export async function uploadUltrasoundImage(
  userId: string,
  checkupId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (file.size > MAX_IMAGE_SIZE) throw new Error('이미지는 10MB 이하만 가능해요')
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 업로드 가능해요')

  const resized = await resizeImage(file)
  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const path = `${userId}/${checkupId}/${Date.now()}.${ext}`

  const supabase = createClient()
  // Simulate progress
  onProgress?.(30)
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, resized, { contentType: `image/${ext}`, upsert: false })
  onProgress?.(100)

  if (error) throw new Error(`업로드 실패: ${error.message}`)
  return path
}

/** Upload an ultrasound video (MP4/MOV). Returns storage path. */
export async function uploadUltrasoundVideo(
  userId: string,
  checkupId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (file.size > MAX_VIDEO_SIZE) throw new Error('동영상은 30MB 이하만 가능해요')
  const validTypes = ['video/mp4', 'video/quicktime', 'video/mov']
  if (!validTypes.includes(file.type)) throw new Error('MP4/MOV 파일만 가능해요')

  const ext = file.type === 'video/mp4' ? 'mp4' : 'mov'
  const path = `${userId}/${checkupId}/video_${Date.now()}.${ext}`

  const supabase = createClient()
  onProgress?.(10)
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  onProgress?.(100)

  if (error) throw new Error(`업로드 실패: ${error.message}`)
  return path
}

/** Get a signed URL with 1hr expiry */
export async function getSignedUrl(path: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY)
  if (error || !data?.signedUrl) throw new Error('URL 생성 실패')
  return data.signedUrl
}

/** Get multiple signed URLs at once */
export async function getSignedUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map()
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_EXPIRY)
  const map = new Map<string, string>()
  if (error || !data) return map
  for (const item of data) {
    if (item.signedUrl && item.path) map.set(item.path, item.signedUrl)
  }
  return map
}

/** Delete a media file from storage */
export async function deleteMedia(path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw new Error(`삭제 실패: ${error.message}`)
}
