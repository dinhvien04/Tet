'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FamilyInviteCard } from './FamilyInviteCard'
import { toast } from 'sonner'

export function CreateFamilyForm() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdFamily, setCreatedFamily] = useState<{ id: string; name: string; invite_code: string } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Vui lòng nhập tên nhà')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/families', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Không thể tạo nhà')
      }

      const data = await response.json()
      
      toast.success(`Tạo nhà "${name.trim()}" thành công!`)
      
      // Show invite card instead of redirecting immediately
      setCreatedFamily(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // If family was created, show invite card
  if (createdFamily) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <h3 className="font-semibold text-green-900">Tạo nhà thành công!</h3>
          <p className="text-sm text-green-700 mt-1">
            Nhà "{createdFamily.name}" đã được tạo. Mời các thành viên gia đình tham gia bằng link bên dưới.
          </p>
        </div>
        
        <FamilyInviteCard inviteCode={createdFamily.invite_code} />
        
        <Button 
          onClick={() => {
            router.push('/dashboard')
            router.refresh()
          }}
          className="w-full"
        >
          Đi đến trang chủ
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="family-name">Tên nhà</Label>
        <Input
          id="family-name"
          type="text"
          placeholder="Ví dụ: Gia đình Nguyễn Văn A"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          disabled={loading}
          maxLength={100}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Đang tạo...' : 'Tạo nhà'}
      </Button>
    </form>
  )
}
