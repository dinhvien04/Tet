'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type ContentType = 'cau-doi' | 'loi-chuc' | 'thiep-tet';

interface AIContentFormProps {
  onContentGenerated?: (content: string, type: ContentType) => void;
}

export function AIContentForm({ onContentGenerated }: AIContentFormProps) {
  const [recipientName, setRecipientName] = useState('');
  const [traits, setTraits] = useState('');
  const [contentType, setContentType] = useState<ContentType>('cau-doi');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');

  const handleGenerate = async () => {
    // Validation
    if (!recipientName.trim()) {
      toast.error('Vui lòng nhập tên người nhận');
      return;
    }

    if (!traits.trim()) {
      toast.error('Vui lòng nhập đặc điểm');
      return;
    }

    setIsLoading(true);
    setGeneratedContent('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

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
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể tạo nội dung');
      }

      const data = await response.json();
      setGeneratedContent(data.content);
      
      if (onContentGenerated) {
        onContentGenerated(data.content, contentType);
      }

      toast.success('Tạo nội dung thành công!');
    } catch (error: any) {
      console.error('Generate error:', error);
      
      if (error.name === 'AbortError') {
        toast.error('Yêu cầu quá lâu. Vui lòng thử lại.');
      } else {
        toast.error(error.message || 'Không thể tạo nội dung. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    handleGenerate();
  };

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
              disabled={isLoading}
            >
              Câu đối
            </Button>
            <Button
              type="button"
              variant={contentType === 'loi-chuc' ? 'default' : 'outline'}
              onClick={() => setContentType('loi-chuc')}
              disabled={isLoading}
            >
              Lời chúc
            </Button>
            <Button
              type="button"
              variant={contentType === 'thiep-tet' ? 'default' : 'outline'}
              onClick={() => setContentType('thiep-tet')}
              disabled={isLoading}
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
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="traits">Đặc điểm</Label>
          <Input
            id="traits"
            placeholder="Ví dụ: hiền lành, yêu thương gia đình..."
            value={traits}
            onChange={(e) => setTraits(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full"
        >
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
            <Button onClick={handleRetry} variant="outline" className="flex-1">
              Tạo lại
            </Button>
            <Button className="flex-1">
              Đăng lên tường nhà
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
