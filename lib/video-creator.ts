/**
 * Video Creator Library
 * Creates video recap from photos using Canvas API and MediaRecorder
 */

export interface VideoCreationOptions {
  photos: string[]
  duration?: number // Duration per photo in milliseconds (default: 3000)
  width?: number // Video width (default: 1920)
  height?: number // Video height (default: 1080)
  fps?: number // Frames per second (default: 30)
  fadeInDuration?: number // Fade in duration as percentage (default: 0.1 = 10%)
  fadeOutDuration?: number // Fade out duration as percentage (default: 0.1 = 10%)
  musicUrl?: string // Background music URL (default: '/tet-music.mp3')
  onProgress?: (progress: number) => void // Progress callback (0-100)
}

export interface VideoCreationResult {
  blob: Blob
  url: string
  duration: number
}

/**
 * Load an image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

/**
 * Draw image with fade effect
 */
function drawImageWithFade(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  opacity: number,
  canvasWidth: number,
  canvasHeight: number
) {
  // Calculate dimensions to fit image in canvas while maintaining aspect ratio
  const imgAspect = img.width / img.height
  const canvasAspect = canvasWidth / canvasHeight
  
  let drawWidth, drawHeight, offsetX, offsetY
  
  if (imgAspect > canvasAspect) {
    // Image is wider than canvas
    drawHeight = canvasHeight
    drawWidth = drawHeight * imgAspect
    offsetX = (canvasWidth - drawWidth) / 2
    offsetY = 0
  } else {
    // Image is taller than canvas
    drawWidth = canvasWidth
    drawHeight = drawWidth / imgAspect
    offsetX = 0
    offsetY = (canvasHeight - drawHeight) / 2
  }
  
  // Clear canvas with black background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  
  // Draw image with opacity
  ctx.globalAlpha = opacity
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
  ctx.globalAlpha = 1.0
}

/**
 * Animate a single photo with fade in/out effects
 */
async function animatePhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  duration: number,
  fps: number,
  fadeInDuration: number,
  fadeOutDuration: number,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  return new Promise<void>((resolve) => {
    const totalFrames = Math.floor((duration / 1000) * fps)
    const fadeInFrames = Math.floor(totalFrames * fadeInDuration)
    const fadeOutFrames = Math.floor(totalFrames * fadeOutDuration)
    let frame = 0
    
    const animate = () => {
      if (frame >= totalFrames) {
        resolve()
        return
      }
      
      // Calculate opacity based on fade in/out
      let opacity = 1.0
      if (frame < fadeInFrames) {
        // Fade in
        opacity = frame / fadeInFrames
      } else if (frame > totalFrames - fadeOutFrames) {
        // Fade out
        opacity = (totalFrames - frame) / fadeOutFrames
      }
      
      drawImageWithFade(ctx, img, opacity, canvasWidth, canvasHeight)
      
      frame++
      setTimeout(animate, 1000 / fps)
    }
    
    animate()
  })
}

/**
 * Check if browser supports video creation
 */
export function isVideoCreationSupported(): boolean {
  return typeof window !== 'undefined' && 
         'MediaRecorder' in window &&
         typeof HTMLCanvasElement.prototype.captureStream === 'function'
}

/**
 * Load audio from URL
 */
async function loadAudio(url: string): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audio.oncanplaythrough = () => resolve(audio)
    audio.onerror = reject
    audio.src = url
    audio.load()
  })
}

/**
 * Create video recap from photos
 */
export async function createVideoRecap(
  options: VideoCreationOptions
): Promise<VideoCreationResult> {
  const {
    photos,
    duration = 3000,
    width = 1920,
    height = 1080,
    fps = 30,
    fadeInDuration = 0.1,
    fadeOutDuration = 0.1,
    musicUrl = '/tet-music.mp3',
    onProgress
  } = options

  // Validate inputs
  if (!photos || photos.length === 0) {
    throw new Error('Chưa có ảnh nào để tạo video.')
  }

  if (photos.length > 50) {
    throw new Error('Tối đa 50 ảnh. Vui lòng chọn ít ảnh hơn.')
  }

  if (!isVideoCreationSupported()) {
    throw new Error('Trình duyệt không hỗ trợ tạo video. Vui lòng dùng Chrome hoặc Edge.')
  }

  // Create canvas
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D
  
  try {
    canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    
    if (!context) {
      throw new Error('Không thể khởi tạo canvas. Vui lòng thử lại.')
    }
    
    ctx = context
  } catch {
    throw new Error('Không đủ bộ nhớ để tạo video. Vui lòng thử với ít ảnh hơn hoặc đóng các tab khác.')
  }

  // Load and setup audio (optional)
  let audio: HTMLAudioElement | null = null
  let audioContext: AudioContext | null = null
  let audioDestination: MediaStreamAudioDestinationNode | null = null
  
  try {
    audio = await loadAudio(musicUrl)
    audioContext = new AudioContext()
    const source = audioContext.createMediaElementSource(audio)
    audioDestination = audioContext.createMediaStreamDestination()
    source.connect(audioDestination)
    source.connect(audioContext.destination)
    audio.loop = true // Loop music if video is longer
  } catch (error) {
    console.warn('Failed to load background music, continuing without audio:', error)
  }

  // Setup MediaRecorder with audio track if available
  let mediaRecorder: MediaRecorder
  
  try {
    const videoStream = canvas.captureStream(fps)
    let combinedStream = videoStream
    
    if (audioDestination) {
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks()
      ])
    }
    
    // Try VP9 codec first, fallback to VP8 if not supported
    let mimeType = 'video/webm;codecs=vp9'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm'
      }
    }
    
    mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 5000000 // 5 Mbps
    })
  } catch {
    throw new Error('Không thể khởi tạo bộ ghi video. Vui lòng thử lại.')
  }

  const chunks: Blob[] = []
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data)
    }
  }

  // Start recording
  mediaRecorder.start()
  
  // Start audio playback if available
  if (audio) {
    try {
      await audio.play()
    } catch (error) {
      console.warn('Failed to play audio:', error)
    }
  }

  // Load and animate each photo
  for (let i = 0; i < photos.length; i++) {
    try {
      const img = await loadImage(photos[i])
      await animatePhoto(
        ctx,
        img,
        duration,
        fps,
        fadeInDuration,
        fadeOutDuration,
        width,
        height
      )
      
      // Report progress
      if (onProgress) {
        const progress = ((i + 1) / photos.length) * 100
        onProgress(Math.round(progress))
      }
    } catch (error) {
      console.error(`Failed to load photo ${i}:`, error)
      
      // Cleanup on error
      if (audio) {
        audio.pause()
      }
      if (audioContext) {
        audioContext.close()
      }
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
      
      throw new Error(`Không thể tải ảnh thứ ${i + 1}. Vui lòng kiểm tra kết nối mạng và thử lại.`)
    }
  }

  // Stop recording and wait for final data
  return new Promise<VideoCreationResult>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      clearTimeout(timeoutId)
      
      try {
        // Stop audio and cleanup
        if (audio) {
          audio.pause()
          audio.currentTime = 0
        }
        if (audioContext) {
          audioContext.close()
        }
        
        // Check if we have any data
        if (chunks.length === 0) {
          throw new Error('Không có dữ liệu video. Vui lòng thử lại.')
        }
        
        const blob = new Blob(chunks, { type: 'video/webm' })
        
        // Check blob size to detect potential memory issues
        if (blob.size === 0) {
          throw new Error('Video bị lỗi. Vui lòng thử với ít ảnh hơn.')
        }
        
        const url = URL.createObjectURL(blob)
        const totalDuration = photos.length * duration
        
        resolve({
          blob,
          url,
          duration: totalDuration
        })
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Không thể tạo video. Vui lòng thử lại.'))
      }
    }

    mediaRecorder.onerror = (event: any) => {
      clearTimeout(timeoutId)
      
      // Cleanup on error
      if (audio) {
        audio.pause()
      }
      if (audioContext) {
        audioContext.close()
      }
      
      const errorMessage = event.error?.message || 'Lỗi khi ghi video'
      
      // Check for common error types
      if (errorMessage.includes('memory') || errorMessage.includes('quota')) {
        reject(new Error('Không đủ bộ nhớ. Vui lòng thử với ít ảnh hơn hoặc đóng các tab khác.'))
      } else {
        reject(new Error('Không thể ghi video. Vui lòng thử lại.'))
      }
    }

    // Set timeout to prevent hanging (5 minutes max)
    const maxTimeout = 5 * 60 * 1000
    const timeoutId = setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
      
      // Cleanup
      if (audio) {
        audio.pause()
      }
      if (audioContext) {
        audioContext.close()
      }
      
      reject(new Error('Quá trình tạo video mất quá nhiều thời gian. Vui lòng thử với ít ảnh hơn.'))
    }, maxTimeout)

    // Stop recording
    try {
      mediaRecorder.stop()
    } catch {
      clearTimeout(timeoutId)
      reject(new Error('Không thể dừng ghi video. Vui lòng thử lại.'))
    }
  })
}

/**
 * Convert Blob to base64 string for API upload
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert blob to base64'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
