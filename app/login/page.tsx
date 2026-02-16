'use client'

import { LoginButton } from '@/components/auth/LoginButton'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const redirect = searchParams.get('redirect')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600">Tết Connect</h1>
          <p className="mt-2 text-sm text-gray-600">
            Kết nối gia đình trong dịp Tết
          </p>
        </div>
        
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error === 'auth_failed' && 'Đăng nhập thất bại. Vui lòng thử lại.'}
            {error === 'config' && 'Lỗi cấu hình hệ thống.'}
            {error === 'unexpected' && 'Có lỗi xảy ra. Vui lòng thử lại.'}
          </div>
        )}
        
        <div className="mt-8">
          <LoginButton />
        </div>
        
        <p className="text-center text-xs text-gray-500">
          Đăng nhập để tạo không gian riêng cho gia đình bạn
        </p>
        
        {redirect && (
          <p className="text-center text-xs text-gray-400">
            Bạn sẽ được chuyển về trang trước đó sau khi đăng nhập
          </p>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-red-600 border-r-transparent"></div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
