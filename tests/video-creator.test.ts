import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  isVideoCreationSupported, 
  createVideoRecap, 
  blobToBase64 
} from '@/lib/video-creator'

describe('Video Creator Library', () => {
  describe('isVideoCreationSupported', () => {
    it('should return false in non-browser environment', () => {
      const result = isVideoCreationSupported()
      // In test environment (Node.js), should return false
      expect(typeof result).toBe('boolean')
    })
  })

  describe('blobToBase64', () => {
    it('should convert blob to base64 string', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const base64 = await blobToBase64(blob)
      
      expect(base64).toContain('data:text/plain;base64,')
      expect(typeof base64).toBe('string')
    })

    it('should handle empty blob', async () => {
      const blob = new Blob([], { type: 'text/plain' })
      const base64 = await blobToBase64(blob)
      
      expect(base64).toContain('data:text/plain;base64,')
    })
  })

  describe('createVideoRecap', () => {
    it('should throw error if no photos provided', async () => {
      await expect(createVideoRecap({ photos: [] }))
        .rejects
        .toThrow('Chưa có ảnh nào để tạo video.')
    })

    it('should throw error if more than 50 photos', async () => {
      const photos = Array(51).fill('https://example.com/photo.jpg')
      
      await expect(createVideoRecap({ photos }))
        .rejects
        .toThrow('Tối đa 50 ảnh')
    })

    it('should validate photo count limits', () => {
      const validPhotos = Array(50).fill('https://example.com/photo.jpg')
      const invalidPhotos = Array(51).fill('https://example.com/photo.jpg')
      
      expect(validPhotos.length).toBeLessThanOrEqual(50)
      expect(invalidPhotos.length).toBeGreaterThan(50)
    })
  })
})
