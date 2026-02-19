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
  const [createdFamily, setCreatedFamily] = useState<{
    id: string
    name: string
    invite_code: string
  } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Vui long nhap ten nha')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Khong the tao nha')
      }

      const data = await response.json()
      toast.success(`Tao nha "${name.trim()}" thanh cong!`)
      setCreatedFamily(data.family)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Co loi xay ra'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (createdFamily) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <h3 className="font-semibold text-green-900">Tao nha thanh cong!</h3>
          <p className="text-sm text-green-700 mt-1">
            Nha &quot;{createdFamily.name}&quot; da duoc tao. Moi cac thanh vien gia dinh
            tham gia bang link ben duoi.
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
          Di den trang chu
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="family-name">Ten nha</Label>
        <Input
          id="family-name"
          type="text"
          placeholder="Vi du: Gia dinh Nguyen Van A"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          disabled={loading}
          maxLength={100}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Dang tao...' : 'Tao nha'}
      </Button>
    </form>
  )
}
