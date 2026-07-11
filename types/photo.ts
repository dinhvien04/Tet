/** Shared photo DTO — camelCase primary; optional snake_case for transition. */
export interface PhotoUser {
  id: string
  name: string
  email?: string
  avatar?: string | null
}

export interface Photo {
  id: string
  url: string
  familyId?: string
  family_id?: string
  userId?: string
  user_id?: string
  uploadedAt?: string | Date
  uploaded_at?: string | Date
  users?: PhotoUser
  uploader?: PhotoUser
}

export function photoUploadedAt(photo: Photo): string {
  const v = photo.uploadedAt ?? photo.uploaded_at
  if (!v) return new Date(0).toISOString()
  return v instanceof Date ? v.toISOString() : String(v)
}
