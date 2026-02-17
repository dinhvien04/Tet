'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout'
import { useFamily } from '@/components/family/FamilyContext'
import { PostFeed } from '@/components/posts/PostFeed'

export default function PostsPage() {
  const { currentFamily } = useFamily()

  if (!currentFamily) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-gray-600">
              Vui lòng chọn hoặc tạo một nhà để xem bài đăng
            </p>
          </div>
        </AppLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-red-600 mb-6">
            Bài đăng
          </h1>
          <PostFeed familyId={currentFamily.id} />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
