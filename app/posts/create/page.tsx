'use client'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout'
import { useFamily } from '@/components/family/FamilyContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function CreatePostPage() {
  const { currentFamily } = useFamily()
  const router = useRouter()
  const [content, setContent] = useState('')
  const [type, setType] = useState<'cau-doi' | 'loi-chuc' | 'thiep-tet'>('loi-chuc')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      toast.error('Vui lòng nhập nội dung bài đăng')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: currentFamily?.id,
          content,
          type,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create post')
      }

      toast.success('Đã tạo bài đăng')
      router.push('/posts')
    } catch (error) {
      console.error('Error creating post:', error)
      toast.error('Không thể tạo bài đăng. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  if (!currentFamily) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-gray-600">
              Vui lòng chọn hoặc tạo một nhà để tạo bài đăng
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
            Tạo bài đăng mới
          </h1>

          <Card>
            <CardHeader>
              <CardTitle>Nội dung bài đăng</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Loại bài đăng</Label>
                  <Select value={type} onValueChange={(value: 'cau-doi' | 'loi-chuc' | 'thiep-tet') => setType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loi-chuc">Lời chúc</SelectItem>
                      <SelectItem value="cau-doi">Câu đối</SelectItem>
                      <SelectItem value="thiep-tet">Thiệp Tết</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Nội dung</Label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                    placeholder="Nhập nội dung bài đăng..."
                    rows={8}
                    className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Đăng bài
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Hủy
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
