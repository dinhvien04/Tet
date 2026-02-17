/**
 * Toast Notification Examples
 * 
 * This file demonstrates how to use toast notifications throughout the Tết Connect app.
 * We use the 'sonner' library which provides a simple and elegant toast notification system.
 * 
 * The Toaster component is already set up in app/layout.tsx
 */

'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ToastExamples() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">Toast Notification Examples</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Success Messages</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Use for successful operations like creating, updating, or deleting data.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => toast.success('Tạo bài đăng thành công!')}>
              Post Created
            </Button>
            <Button onClick={() => toast.success('Upload ảnh thành công!')}>
              Photo Uploaded
            </Button>
            <Button onClick={() => toast.success('Đã sao chép link mời!')}>
              Link Copied
            </Button>
            <Button onClick={() => toast.success('Tham gia nhà thành công!')}>
              Joined Family
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Error Messages</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Use for failed operations or validation errors.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="destructive"
              onClick={() => toast.error('Không thể tạo bài đăng. Vui lòng thử lại.')}
            >
              Post Failed
            </Button>
            <Button 
              variant="destructive"
              onClick={() => toast.error('Định dạng file không hợp lệ. Chỉ chấp nhận JPG, PNG, HEIC.')}
            >
              Invalid File
            </Button>
            <Button 
              variant="destructive"
              onClick={() => toast.error('Vui lòng nhập tên người nhận')}
            >
              Validation Error
            </Button>
            <Button 
              variant="destructive"
              onClick={() => toast.error('Không thể kết nối đến server')}
            >
              Network Error
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Info Messages</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Use for informational messages that don't indicate success or failure.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline"
              onClick={() => toast.info('Đang xử lý yêu cầu của bạn...')}
            >
              Processing
            </Button>
            <Button 
              variant="outline"
              onClick={() => toast.info('Bạn có 3 thông báo mới')}
            >
              New Notifications
            </Button>
            <Button 
              variant="outline"
              onClick={() => toast.info('Sự kiện sắp diễn ra trong 24 giờ')}
            >
              Event Reminder
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Warning Messages</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Use for warnings that require user attention but aren't errors.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline"
              onClick={() => toast.warning('File quá lớn. Kích thước tối đa 10MB.')}
            >
              File Too Large
            </Button>
            <Button 
              variant="outline"
              onClick={() => toast.warning('Bạn chưa lưu thay đổi')}
            >
              Unsaved Changes
            </Button>
            <Button 
              variant="outline"
              onClick={() => toast.warning('Tối đa 50 ảnh cho video recap')}
            >
              Limit Warning
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Loading Messages</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Use for long-running operations to show progress.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline"
              onClick={() => {
                const toastId = toast.loading('Đang upload ảnh...')
                setTimeout(() => {
                  toast.success('Upload thành công!', { id: toastId })
                }, 2000)
              }}
            >
              Upload with Loading
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                const toastId = toast.loading('Đang tạo video...')
                setTimeout(() => {
                  toast.success('Tạo video thành công!', { id: toastId })
                }, 3000)
              }}
            >
              Video Creation
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Custom Duration</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Control how long toasts are displayed (default is 4 seconds).
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline"
              onClick={() => toast.success('Quick message', { duration: 1000 })}
            >
              1 Second
            </Button>
            <Button 
              variant="outline"
              onClick={() => toast.info('Normal message', { duration: 4000 })}
            >
              4 Seconds (Default)
            </Button>
            <Button 
              variant="outline"
              onClick={() => toast.warning('Important message', { duration: 10000 })}
            >
              10 Seconds
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">With Actions</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Add action buttons to toasts for user interaction.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline"
              onClick={() => toast.error('Upload thất bại', {
                action: {
                  label: 'Thử lại',
                  onClick: () => console.log('Retry clicked')
                }
              })}
            >
              With Retry Action
            </Button>
            <Button 
              variant="outline"
              onClick={() => toast.info('Bạn có thông báo mới', {
                action: {
                  label: 'Xem',
                  onClick: () => console.log('View clicked')
                }
              })}
            >
              With View Action
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Usage in Components</h3>
        <pre className="text-sm overflow-x-auto">
{`import { toast } from 'sonner'

// Success
toast.success('Tạo bài đăng thành công!')

// Error
toast.error('Không thể tạo bài đăng. Vui lòng thử lại.')

// Info
toast.info('Đang xử lý yêu cầu của bạn...')

// Warning
toast.warning('File quá lớn. Kích thước tối đa 10MB.')

// Loading with update
const toastId = toast.loading('Đang upload...')
// ... do async work
toast.success('Upload thành công!', { id: toastId })

// With action
toast.error('Upload thất bại', {
  action: {
    label: 'Thử lại',
    onClick: () => handleRetry()
  }
})

// Custom duration
toast.success('Quick message', { duration: 2000 })
`}
        </pre>
      </div>
    </div>
  )
}
