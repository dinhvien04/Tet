'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout'
import { useFamily } from '@/components/family/FamilyContext'
import { CreateEventForm } from '@/components/events/CreateEventForm'

export default function CreateEventPage() {
  const { currentFamily } = useFamily()

  if (!currentFamily) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-gray-600">
              Vui lòng chọn hoặc tạo một nhà để tạo sự kiện
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
            Tạo sự kiện mới
          </h1>
          <CreateEventForm familyId={currentFamily.id} />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
