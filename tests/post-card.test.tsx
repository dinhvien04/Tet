import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PostCard, Post } from '@/components/posts/PostCard'

describe('PostCard Component', () => {
  const mockPost: Post = {
    id: 'post-1',
    family_id: 'family-1',
    user_id: 'user-1',
    content: 'Chúc mừng năm mới!',
    type: 'loi-chuc',
    created_at: new Date().toISOString(),
    users: {
      id: 'user-1',
      name: 'Nguyễn Văn A',
      avatar: null,
      email: 'test@example.com'
    },
    reactions: {
      heart: 5,
      haha: 3
    },
    userReaction: null
  }

  it('should render post content correctly', () => {
    render(<PostCard post={mockPost} />)
    
    expect(screen.getByText('Chúc mừng năm mới!')).toBeInTheDocument()
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument()
    expect(screen.getByText('Lời chúc')).toBeInTheDocument()
  })

  it('should display reaction counts', () => {
    render(<PostCard post={mockPost} />)
    
    expect(screen.getByText('5')).toBeInTheDocument() // heart count
    expect(screen.getByText('3')).toBeInTheDocument() // haha count
  })

  it('should call onReaction when heart button is clicked', () => {
    const onReaction = vi.fn()
    render(<PostCard post={mockPost} onReaction={onReaction} />)
    
    const heartButton = screen.getAllByRole('button')[0]
    fireEvent.click(heartButton)
    
    expect(onReaction).toHaveBeenCalledWith('post-1', 'heart')
  })

  it('should call onReaction when haha button is clicked', () => {
    const onReaction = vi.fn()
    render(<PostCard post={mockPost} onReaction={onReaction} />)
    
    const hahaButton = screen.getAllByRole('button')[1]
    fireEvent.click(hahaButton)
    
    expect(onReaction).toHaveBeenCalledWith('post-1', 'haha')
  })

  it('should highlight user reaction', () => {
    const postWithUserReaction = {
      ...mockPost,
      userReaction: 'heart' as const
    }
    
    render(<PostCard post={postWithUserReaction} />)
    
    const heartButton = screen.getAllByRole('button')[0]
    expect(heartButton).toHaveClass('bg-primary')
  })

  it('should display user initials when no avatar', () => {
    render(<PostCard post={mockPost} />)
    
    // The initials are "NV" (first two letters from "Nguyễn Văn")
    expect(screen.getByText('NV')).toBeInTheDocument()
  })

  it('should render different post types correctly', () => {
    const cauDoiPost = { ...mockPost, type: 'cau-doi' as const }
    const { rerender } = render(<PostCard post={cauDoiPost} />)
    expect(screen.getByText('Câu đối')).toBeInTheDocument()
    
    const thiepTetPost = { ...mockPost, type: 'thiep-tet' as const }
    rerender(<PostCard post={thiepTetPost} />)
    expect(screen.getByText('Thiệp Tết')).toBeInTheDocument()
  })

  it('should not display reaction counts when zero', () => {
    const postWithNoReactions = {
      ...mockPost,
      reactions: { heart: 0, haha: 0 }
    }
    
    render(<PostCard post={postWithNoReactions} />)
    
    // Should not display "0" text
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button.textContent).not.toContain('0')
    })
  })
})
