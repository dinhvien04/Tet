# Video Recap Module

This module provides functionality to create video recaps from family photos with fade transitions and background music.

## Features

- ✅ Canvas-based video rendering (client-side)
- ✅ Fade in/out transitions between photos
- ✅ Background music support (Tết-themed)
- ✅ Upload to Supabase Storage
- ✅ Progress tracking
- ✅ Browser compatibility check
- ✅ Photo selection UI with preview
- ✅ Processing status with progress bar
- ✅ Video preview and download
- ✅ Error handling with retry

## Architecture

### Client-Side Processing
The video creation happens entirely in the browser using:
- **Canvas API**: For rendering photos with transitions
- **MediaRecorder API**: For capturing canvas stream as video
- **Web Audio API**: For adding background music

### Server-Side Upload
Once the video is created, it's uploaded to Supabase Storage via API route.

## Usage

### Quick Start (Recommended)

The easiest way to add video creation to your app is using the `VideoRecapCreator` component:

```typescript
import { VideoRecapCreator } from '@/components/videos'

function PhotoAlbumPage({ photos, familyId }) {
  return (
    <div>
      <h1>Album ảnh</h1>
      
      {/* Add video creation button */}
      <VideoRecapCreator 
        photos={photos} 
        familyId={familyId}
        maxPhotos={50}
      />
      
      {/* Your photo grid */}
      <PhotoGrid photos={photos} />
    </div>
  )
}
```

The `VideoRecapCreator` component handles:
- ✅ Photo selection UI
- ✅ Video processing with progress
- ✅ Upload to server
- ✅ Video preview and download
- ✅ Error handling

### Individual Components

You can also use individual components for custom workflows:

#### 1. VideoRecapButton

```typescript
import { VideoRecapButton } from '@/components/videos'

<VideoRecapButton 
  onClick={() => console.log('Create video')}
  disabled={false}
/>
```

#### 2. PhotoSelector

```typescript
import { PhotoSelector } from '@/components/videos'

<PhotoSelector
  photos={photos}
  selectedPhotoIds={selectedIds}
  onSelectionChange={setSelectedIds}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  maxPhotos={50}
/>
```

#### 3. VideoProcessingStatus

```typescript
import { VideoProcessingStatus } from '@/components/videos'

<VideoProcessingStatus
  status="processing" // 'idle' | 'processing' | 'uploading' | 'completed' | 'error'
  progress={75}
  error="Error message"
  onRetry={handleRetry}
  onClose={handleClose}
/>
```

#### 4. VideoPreview

```typescript
import { VideoPreview } from '@/components/videos'

<VideoPreview
  videoUrl="https://storage.supabase.co/..."
  onClose={handleClose}
  onDownload={handleDownload}
/>
```

### Low-Level API

For advanced use cases, use the video creator library directly:

```typescript
import { createVideoRecap, blobToBase64, isVideoCreationSupported } from '@/lib/video-creator'

// Check browser support
if (!isVideoCreationSupported()) {
  alert('Your browser does not support video creation. Please use Chrome or Edge.')
}

// Create video
const result = await createVideoRecap({
  photos: photoUrls,
  duration: 3000, // 3 seconds per photo
  onProgress: (progress) => {
    console.log(`Progress: ${progress}%`)
  }
})

// Convert to base64 for upload
const base64Video = await blobToBase64(result.blob)

// Upload to server
const response = await fetch('/api/videos/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    familyId: 'your-family-id',
    photoUrls: photoUrls,
    videoBlob: base64Video
  })
})

const data = await response.json()
console.log('Video URL:', data.videoUrl)
```

### Customize Video Options

```typescript
const result = await createVideoRecap({
  photos: photoUrls,
  duration: 4000,           // 4 seconds per photo
  width: 1280,              // Video width
  height: 720,              // Video height
  fps: 30,                  // Frames per second
  fadeInDuration: 0.15,     // 15% fade in
  fadeOutDuration: 0.15,    // 15% fade out
  musicUrl: '/custom-music.mp3', // Custom background music
  onProgress: (progress) => {
    setProgress(progress)
  }
})
```

## API Endpoint

### POST /api/videos/create

Creates and uploads a video recap.

**Request Body:**
```json
{
  "familyId": "uuid",
  "photoUrls": ["url1", "url2", "url3"],
  "videoBlob": "data:video/webm;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "videoUrl": "https://storage.supabase.co/...",
  "path": "family-id/recap-timestamp.webm"
}
```

**Error Responses:**
- `401`: Unauthorized (not logged in)
- `400`: Missing required fields or invalid photo URLs
- `403`: Not a member of the family
- `500`: Server error during upload

## Limitations

- Maximum 50 photos per video
- Browser must support MediaRecorder API (Chrome, Edge, Firefox)
- Video format: WebM with VP9 codec
- File size depends on number of photos and duration

## Background Music

To add background music:

1. Place your music file in `public/tet-music.mp3`
2. Recommended format: MP3, 128-192 kbps
3. Duration: 30-60 seconds (will loop if needed)
4. Style: Traditional Vietnamese Tết music (instrumental)

See `public/tet-music.md` for more details on music sources.

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome  | ✅ Full |
| Edge    | ✅ Full |
| Firefox | ✅ Full |
| Safari  | ⚠️ Limited (no VP9) |
| Mobile  | ⚠️ Varies |

**Note:** Safari uses H.264 codec instead of VP9. The library will automatically use the best available codec.

## Error Handling

The library throws errors for:
- No photos provided
- More than 50 photos
- Browser doesn't support MediaRecorder
- Failed to load photos
- Failed to load audio

Always wrap calls in try-catch:

```typescript
try {
  const result = await createVideoRecap({ photos })
} catch (error) {
  if (error.message.includes('Browser does not support')) {
    // Show browser compatibility message
  } else if (error.message.includes('Maximum 50 photos')) {
    // Show photo limit message
  } else {
    // Generic error handling
  }
}
```

## Performance Considerations

- Video creation is CPU-intensive
- Larger photos take longer to process
- Consider showing a loading indicator
- Recommend 10-20 photos for best experience
- Processing time: ~1-2 seconds per photo

## Future Enhancements

Potential improvements:
- [ ] Custom text overlays
- [ ] Multiple transition effects
- [ ] Video quality settings
- [ ] Server-side processing option (for better quality)
- [ ] Support for video clips (not just photos)
- [ ] Custom music upload
