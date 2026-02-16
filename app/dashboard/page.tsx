'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-red-600">Dashboard</h1>
          <p className="mt-4 text-gray-600">
            Chào mừng đến với Tết Connect, {user?.user_metadata?.full_name || user?.email}!
          </p>
          <p className="mt-2 text-sm text-gray-500">
            (Dashboard sẽ được phát triển trong các task tiếp theo)
          </p>
          <div className="flex gap-4 justify-center mt-6">
            <Button 
              onClick={() => router.push('/family/create')}
              className="bg-red-600 hover:bg-red-700"
            >
              Tạo nhà mới
            </Button>
            <Button 
              onClick={handleSignOut}
              variant="outline"
            >
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
