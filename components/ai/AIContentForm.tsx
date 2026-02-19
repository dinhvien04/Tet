'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type ContentType = 'cau-doi' | 'loi-chuc' | 'thiep-tet'

interface AIContentFormProps {
  familyId?: string
  onContentGenerated?: (content: string, type: ContentType) => void
}

export function AIContentForm({ familyId, onContentGenerated }: AIContentFormProps) {
  const router = useRouter()
  const [recipientName, setRecipientName] = useState('')
  const [traits, setTraits] = useState('')
  const [contentType, setContentType] = useState<ContentType>('cau-doi')
  const [isLoading, setIsLoading] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')

  const handleGenerate = async () => {
    if (!recipientName.trim()) {
      toast.error('Vui lòng nhập tên người nhận')
      return
    }

    if (!traits.trim()) {
      toast.error('Vui lòng nhập đặc điểm')
      return
    }

    setIsLoading(true)
    setGeneratedContent('')

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: contentType,
          recipientName: recipientName.trim(),
          traits: traits.trim(),
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Không thể tạo nội dung')
      }

      const data = await response.json()
      setGeneratedContent(data.content)

      if (onContentGenerated) {
        onContentGenerated(data.content, contentType)
      }

      toast.success('Tạo nội dung thành công!')
    } catch (error: unknown) {
      console.error('Generate error:', error)

      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Yêu cầu quá lâu. Vui lòng thử lại.')
      } else if (error instanceof Error) {
        toast.error(error.message || 'Không thể tạo nội dung. Vui lòng thử lại.')
      } else {
        toast.error('Không thể tạo nội dung. Vui lòng thử lại.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    handleGenerate()
  }

  const handlePostToWall = async () => {
    if (!generatedContent.trim()) {
      toast.error('Chưa có nội dung để đăng')
      return
    }

    if (!familyId) {
      toast.error('Không tìm thấy nhà hiện tại')
      return
    }

    setIsPosting(true)

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyId,
          content: generatedContent.trim(),
          type: contentType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Không thể đăng bài')
      }

      toast.success('Đã đăng lên tường nhà')
      router.push('/posts')
    } catch (error: unknown) {
      console.error('Post to wall error:', error)

      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Không thể đăng bài')
      }
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contentType">Loại nội dung</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={contentType === 'cau-doi' ? 'default' : 'outline'}
              onClick={() => setContentType('cau-doi')}
              disabled={isLoading || isPosting}
            >
              Câu đối
            </Button>
            <Button
              type="button"
              variant={contentType === 'loi-chuc' ? 'default' : 'outline'}
              onClick={() => setContentType('loi-chuc')}
              disabled={isLoading || isPosting}
            >
              Lời chúc
            </Button>
            <Button
              type="button"
              variant={contentType === 'thiep-tet' ? 'default' : 'outline'}
              onClick={() => setContentType('thiep-tet')}
              disabled={isLoading || isPosting}
            >
              Thiệp Tết
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipientName">Tên người nhận</Label>
          <Input
            id="recipientName"
            placeholder="Ví dụ: Bố, Mẹ, Ông, Bà..."
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            disabled={isLoading || isPosting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="traits">Đặc điểm</Label>
          <Input
            id="traits"
            placeholder="Ví dụ: hiền lành, yêu thương gia đình..."
            value={traits}
            onChange={(e) => setTraits(e.target.value)}
            disabled={isLoading || isPosting}
          />
        </div>

        <Button onClick={handleGenerate} disabled={isLoading || isPosting} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tạo...
            </>
          ) : (
            'Tạo nội dung'
          )}
        </Button>
      </div>

      {generatedContent && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold mb-2">Nội dung đã tạo:</h3>
            <p className="whitespace-pre-wrap">{generatedContent}</p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleRetry}
              variant="outline"
              className="flex-1"
              disabled={isPosting}
            >
              Tạo lại
            </Button>
            <Button
              className="flex-1"
              onClick={handlePostToWall}
              disabled={isPosting || !generatedContent.trim()}
            >
              {isPosting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang đăng...
                </>
              ) : (
                'Đăng lên tường nhà'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
