'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Heart, Laugh, MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface PostUser {
  id: string
  name: string
  avatar: string | null
  email: string
}

interface PostComment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  users: PostUser
}

export interface Post {
  id: string
  family_id: string
  user_id: string
  content: string
  type: 'cau-doi' | 'loi-chuc' | 'thiep-tet'
  created_at: string
  users: PostUser
  reactions?: {
    heart: number
    haha: number
  }
  userReaction?: 'heart' | 'haha' | null
  commentsCount?: number
}

interface PostCardProps {
  post: Post
  onReaction?: (postId: string, type: 'heart' | 'haha') => void
}

const POST_TYPE_LABELS = {
  'cau-doi': 'Cau doi',
  'loi-chuc': 'Loi chuc',
  'thiep-tet': 'Thiep Tet',
}

export function PostCard({ post, onReaction }: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<PostComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [localCommentsCount, setLocalCommentsCount] = useState(post.commentsCount || 0)

  useEffect(() => {
    setLocalCommentsCount(post.commentsCount || 0)
  }, [post.commentsCount, post.id])

  const handleReaction = (type: 'heart' | 'haha') => {
    if (onReaction) {
      onReaction(post.id, type)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const loadComments = async () => {
    try {
      setCommentsLoading(true)
      const response = await fetch(`/api/posts/${post.id}/comments`)
      if (!response.ok) {
        throw new Error('Khong the tai binh luan')
      }

      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error('Error loading comments:', error)
      toast.error('Khong the tai binh luan')
    } finally {
      setCommentsLoading(false)
    }
  }

  const handleToggleComments = async () => {
    const nextShow = !showComments
    setShowComments(nextShow)

    if (nextShow && comments.length === 0) {
      await loadComments()
    }
  }

  const handleSubmitComment = async () => {
    const content = newComment.trim()
    if (!content) return

    try {
      setCommentSubmitting(true)

      const response = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Khong the gui binh luan')
      }

      const data = await response.json()
      const createdComment = data.comment as PostComment
      setComments((prev) => [...prev, createdComment])
      setLocalCommentsCount((prev) => prev + 1)
      setNewComment('')
    } catch (error) {
      console.error('Error creating comment:', error)
      toast.error(error instanceof Error ? error.message : 'Khong the gui binh luan')
    } finally {
      setCommentSubmitting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center gap-3 md:gap-4 pb-3">
        <Avatar className="h-10 w-10 md:h-12 md:w-12">
          <AvatarImage src={post.users.avatar || undefined} alt={post.users.name} />
          <AvatarFallback>{getInitials(post.users.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm md:text-base truncate">{post.users.name}</h3>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {POST_TYPE_LABELS[post.type]}
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), {
              addSuffix: true,
              locale: vi,
            })}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap text-sm md:text-base mb-4 break-words">
          {post.content}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant={post.userReaction === 'heart' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleReaction('heart')}
            className="gap-1 text-xs md:text-sm"
          >
            <Heart className={`h-4 w-4 ${post.userReaction === 'heart' ? 'fill-current' : ''}`} />
            {post.reactions && post.reactions.heart > 0 && <span>{post.reactions.heart}</span>}
          </Button>

          <Button
            variant={post.userReaction === 'haha' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleReaction('haha')}
            className="gap-1 text-xs md:text-sm"
          >
            <Laugh className={`h-4 w-4 ${post.userReaction === 'haha' ? 'fill-current' : ''}`} />
            {post.reactions && post.reactions.haha > 0 && <span>{post.reactions.haha}</span>}
          </Button>

          <Button
            variant={showComments ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => {
              void handleToggleComments()
            }}
            className="gap-1 text-xs md:text-sm"
          >
            <MessageCircle className="h-4 w-4" />
            {localCommentsCount > 0 && <span>{localCommentsCount}</span>}
          </Button>
        </div>

        {showComments && (
          <div className="mt-4 space-y-3 border-t pt-3">
            {commentsLoading ? (
              <p className="text-sm text-muted-foreground">Dang tai binh luan...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chua co binh luan nao</p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={comment.users.avatar || undefined}
                        alt={comment.users.name}
                      />
                      <AvatarFallback>{getInitials(comment.users.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{comment.users.name}</p>
                      <p className="text-sm break-words">{comment.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Viet binh luan..."
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                disabled={commentSubmitting}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleSubmitComment()
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => {
                  void handleSubmitComment()
                }}
                disabled={commentSubmitting || !newComment.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
