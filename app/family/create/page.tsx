'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { CreateFamilyForm } from '@/components/family/CreateFamilyForm'

export default function CreateFamilyPage() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-red-600">Tạo Nhà Mới</h1>
            <p className="mt-2 text-gray-600">
              Tạo không gian riêng cho gia đình bạn
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <CreateFamilyForm />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
