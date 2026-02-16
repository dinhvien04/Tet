import { createClient } from '@/lib/supabase'
import { EventDetail } from '@/components/events/EventDetail'
import { redirect } from 'next/navigation'

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch event
  const { data: event, error } = await supabase
    .from('events')
    .select('*, users!events_created_by_fkey(id, name, avatar)')
    .eq('id', id)
    .single()

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Không tìm thấy sự kiện</h1>
          <p className="text-gray-600 mt-2">Sự kiện này không tồn tại hoặc bạn không có quyền truy cập.</p>
        </div>
      </div>
    )
  }

  // Verify user is member of the family
  const { data: membership } = await supabase
    .from('family_members')
    .select('id')
    .eq('family_id', event.family_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Không có quyền truy cập</h1>
          <p className="text-gray-600 mt-2">Bạn không phải là thành viên của gia đình này.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <EventDetail
        event={event}
        familyId={event.family_id}
        currentUserId={user.id}
      />
    </div>
  )
}
