# Photos Components

Components for photo upload, display, and management in Tết Connect.

## PhotoUploader

A comprehensive photo upload component with drag & drop, file picker, and camera support.

### Features

- **Drag & Drop**: Drag photos directly into the upload area
- **File Picker**: Click to select photos from device
- **Camera Support**: Take photos directly on mobile devices
- **File Validation**: Validates file type (JPG, PNG, HEIC) and size (max 10MB)
- **Upload Progress**: Visual progress bar during upload
- **Preview**: Shows preview of selected photo before upload
- **Error Handling**: Clear error messages for validation and upload failures

### Usage

```tsx
import { PhotoUploader } from '@/components/photos'

function AlbumPage() {
  const handleUploadSuccess = (photo) => {
    console.log('Photo uploaded:', photo)
    // Refresh photo list or add to state
  }

  const handleUploadError = (error) => {
    console.error('Upload failed:', error)
  }

  return (
    <PhotoUploader
      familyId="family-123"
      onUploadSuccess={handleUploadSuccess}
      onUploadError={handleUploadError}
    />
  )
}
```

### Props

- `familyId` (string, required): The ID of the family to upload photos to
- `onUploadSuccess` (function, optional): Callback when upload succeeds, receives photo object
- `onUploadError` (function, optional): Callback when upload fails, receives error message

### Requirements Validated

- **10.1**: Upload button and interface
- **10.2**: File picker dialog
- **10.7**: Error messages for invalid files
- **14.4**: Camera support on mobile devices

### Design Notes

- Mobile-first responsive design
- Camera button only visible on mobile devices
- Drag & drop works on desktop
- Progress simulation for better UX (actual progress tracking would require streaming)
- Automatic cleanup of file inputs after upload

---

## PhotoGrid

A responsive grid layout for displaying photos with lazy loading and hover effects.

### Features

- **Responsive Grid**: Adapts from 2 columns (mobile) to 5 columns (desktop)
- **Lazy Loading**: Images load only when visible in viewport (Requirement 15.2)
- **Skeleton Loaders**: Shows loading state before images load
- **Hover Effects**: Scale animation and user info overlay on hover
- **Click Handler**: Opens photo in full view when clicked
- **Empty State**: Displays message when no photos available

### Usage

```tsx
import { PhotoGrid } from '@/components/photos'

function AlbumPage() {
  const [photos, setPhotos] = useState([])

  const handlePhotoClick = (photo, index) => {
    // Open photo viewer
    setSelectedPhoto({ photo, index })
  }

  return (
    <PhotoGrid 
      photos={photos} 
      onPhotoClick={handlePhotoClick}
    />
  )
}
```

### Props

- `photos` (Photo[], required): Array of photo objects with url, users, etc.
- `onPhotoClick` (function, optional): Callback when photo is clicked, receives (photo, index)

### Requirements Validated

- **10.6**: Display photos in album
- **11.1**: Order photos by upload time (descending)
- **15.2**: Lazy loading for performance

### Design Notes

- Uses Next.js Image component for optimization
- Responsive breakpoints: 2 (mobile) → 3 (sm) → 4 (md) → 5 (lg) columns
- Aspect ratio maintained at 1:1 (square)
- Hover overlay shows uploader name
- Skeleton loader provides visual feedback during load

---

## PhotoTimeline

Groups photos by date and displays them in a timeline format with sticky date headers.

### Features

- **Date Grouping**: Automatically groups photos by upload date (Requirement 11.2)
- **Sticky Headers**: Date headers stick to top while scrolling
- **Photo Count**: Shows number of photos for each date
- **Vietnamese Locale**: Dates formatted in Vietnamese
- **Chronological Order**: Newest dates first (Requirement 11.1)
- **Integrated Grid**: Uses PhotoGrid for each date group

### Usage

```tsx
import { PhotoTimeline } from '@/components/photos'

function AlbumPage() {
  const [photos, setPhotos] = useState([])

  const handlePhotoClick = (photo, index) => {
    // Open photo viewer
    setSelectedPhoto({ photo, index })
  }

  return (
    <PhotoTimeline 
      photos={photos} 
      onPhotoClick={handlePhotoClick}
    />
  )
}
```

### Props

- `photos` (Photo[], required): Array of photo objects with uploaded_at timestamps
- `onPhotoClick` (function, optional): Callback when photo is clicked, receives (photo, index)

### Requirements Validated

- **11.1**: Order photos by upload time (descending)
- **11.2**: Group photos by date

### Design Notes

- Uses `useMemo` for efficient grouping calculation
- Date format: "1 tháng 1, 2024" (Vietnamese locale)
- Sticky positioning with backdrop blur for modern look
- Empty state handled gracefully
- Preserves all PhotoGrid features (lazy loading, hover effects)

---

## PhotoViewer

Full-screen lightbox for viewing photos with navigation and metadata display.

### Features

- **Full Screen View**: Displays photo in full size (Requirement 11.3)
- **Metadata Display**: Shows uploader name and upload time (Requirement 11.4)
- **Navigation**: Previous/Next buttons and keyboard support (Requirement 11.5)
- **Photo Counter**: Shows current position (e.g., "3 / 10")
- **Keyboard Support**: Arrow keys for navigation, Escape to close
- **Click Outside**: Close viewer by clicking backdrop
- **Responsive**: Works on mobile and desktop

### Usage

```tsx
import { PhotoViewer } from '@/components/photos'

function AlbumPage() {
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  return (
    <>
      <PhotoTimeline 
        photos={photos}
        onPhotoClick={(photo, index) => setSelectedPhoto({ photo, index })}
      />
      
      {selectedPhoto && (
        <PhotoViewer
          photos={photos}
          currentIndex={selectedPhoto.index}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </>
  )
}
```

### Props

- `photos` (Photo[], required): Array of all photos in the album
- `currentIndex` (number, required): Index of currently displayed photo
- `onClose` (function, required): Callback to close the viewer

### Requirements Validated

- **11.3**: Full view mode when clicking photo
- **11.4**: Display uploader name and upload time
- **11.5**: Navigation to previous/next photo

### Design Notes

- Portal-based rendering for proper z-index layering
- Keyboard event listeners for accessibility
- Disabled navigation buttons at boundaries
- Vietnamese date/time formatting
- Smooth transitions between photos
- Mobile-optimized touch targets

---

## API Route: GET /api/photos

Fetches photos for a specific family with user information.

### Endpoint

```
GET /api/photos?familyId={familyId}
```

### Query Parameters

- `familyId` (string, required): The ID of the family to fetch photos for

### Response

```json
[
  {
    "id": "photo-123",
    "family_id": "family-456",
    "user_id": "user-789",
    "url": "https://storage.supabase.co/...",
    "uploaded_at": "2024-01-15T10:30:00Z",
    "users": {
      "id": "user-789",
      "name": "Nguyễn Văn A",
      "email": "user@example.com",
      "avatar": "https://..."
    }
  }
]
```

### Features

- **Authentication**: Requires valid user session
- **Authorization**: Verifies user is member of the family
- **Ordering**: Returns photos ordered by upload time (newest first)
- **User Info**: Includes uploader information via join
- **Error Handling**: Proper HTTP status codes and error messages

### Requirements Validated

- **10.6**: Fetch photos for display
- **11.1**: Order by upload time (descending)

### Error Responses

- `401 Unauthorized`: User not authenticated
- `400 Bad Request`: Missing familyId parameter
- `403 Forbidden`: User not a member of the family
- `500 Internal Server Error`: Database or server error

---

## Complete Example

Here's a complete example of using all photo components together:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { PhotoUploader, PhotoTimeline, PhotoViewer } from '@/components/photos'

export default function AlbumPage({ familyId }: { familyId: string }) {
  const [photos, setPhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState<{ photo: any, index: number } | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch photos
  useEffect(() => {
    async function fetchPhotos() {
      try {
        const response = await fetch(`/api/photos?familyId=${familyId}`)
        if (response.ok) {
          const data = await response.json()
          setPhotos(data)
        }
      } catch (error) {
        console.error('Failed to fetch photos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPhotos()
  }, [familyId])

  // Handle successful upload
  const handleUploadSuccess = (newPhoto) => {
    setPhotos([newPhoto, ...photos])
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Album Ảnh Gia Đình</h1>
      
      {/* Upload Section */}
      <div className="mb-8">
        <PhotoUploader
          familyId={familyId}
          onUploadSuccess={handleUploadSuccess}
        />
      </div>

      {/* Photo Display */}
      {loading ? (
        <div className="text-center py-12">Đang tải...</div>
      ) : (
        <PhotoTimeline
          photos={photos}
          onPhotoClick={(photo, index) => setSelectedPhoto({ photo, index })}
        />
      )}

      {/* Photo Viewer */}
      {selectedPhoto && (
        <PhotoViewer
          photos={photos}
          currentIndex={selectedPhoto.index}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  )
}
```

---

## Testing

All components have comprehensive test coverage:

- **Unit Tests**: Component rendering, interactions, edge cases
- **Property Tests**: Correctness properties for photo display logic
- **API Tests**: Endpoint validation, authentication, authorization

Run tests:
```bash
npm test -- tests/photos-api.test.ts
npm test -- tests/photo-grid.test.tsx
npm test -- tests/photo-timeline.test.tsx
npm test -- tests/photo-viewer.test.tsx
npm test -- tests/photos-display.property.test.ts
```
