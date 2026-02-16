'use client'

import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Heart, Laugh } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

export interface Post {
  id: string
  family_id: string
  user_id: string
  content: string
  type: 'cau-doi' | 'loi-chuc' | 'thiep-tet'
  created_at: string
  users: {
    id: string
    name: string
    avatar: string | null
    email: string
  }
  reactions?: {
    heart: number
    haha: number
  }
  userReaction?: 'heart' | 'haha' | null
}

interface PostCardProps {
  post: Post
  onReaction?: (postId: string, type: 'heart' | 'haha') => void
}

const POST_TYPE_LABELS = {
  'cau-doi': 'Câu đối',
  'loi-chuc': 'Lời chúc',
  'thiep-tet': 'Thiệp Tết'
}

export function PostCard({ post, onReaction }: PostCardProps) {
  const handleReaction = (type: 'heart' | 'haha') => {
    if (onReaction) {
      onReaction(post.id, type)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center gap-4 pb-3">
        <Avatar>
          <AvatarImage src={post.users.avatar || undefined} alt={post.users.name} />
          <AvatarFallback>{getInitials(post.users.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{post.users.name}</h3>
            <span className="text-xs text-muted-foreground">
              {POST_TYPE_LABELS[post.type]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), {
              addSuffix: true,
              locale: vi
            })}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap text-base mb-4">
          {post.content}
        </div>
        
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant={post.userReaction === 'heart' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleReaction('heart')}
            className="gap-1"
          >
            <Heart className={`h-4 w-4 ${post.userReaction === 'heart' ? 'fill-current' : ''}`} />
            {post.reactions && post.reactions.heart > 0 && (
              <span>{post.reactions.heart}</span>
            )}
          </Button>
          
          <Button
            variant={post.userReaction === 'haha' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleReaction('haha')}
            className="gap-1"
          >
            <Laugh className={`h-4 w-4 ${post.userReaction === 'haha' ? 'fill-current' : ''}`} />
            {post.reactions && post.reactions.haha > 0 && (
              <span>{post.reactions.haha}</span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
