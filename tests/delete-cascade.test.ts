import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('delete cascade contracts', () => {
  it('event delete cascades tasks, rsvp, notifications in transaction', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'app/api/events/[id]/route.ts'),
      'utf8'
    )
    expect(src).toContain('EventTask.deleteMany')
    expect(src).toContain('EventRsvp.deleteMany')
    expect(src).toContain('Notification.deleteMany')
    expect(src).toContain('requireReplicaSet: true')
  })

  it('post delete cascades reactions, comments, notifications in transaction', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'app/api/posts/[id]/route.ts'),
      'utf8'
    )
    expect(src).toContain('Reaction.deleteMany')
    expect(src).toContain('Comment.deleteMany')
    expect(src).toContain('Notification.deleteMany')
    expect(src).toContain('requireReplicaSet: true')
  })
})
