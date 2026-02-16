// Database types for Tết Connect

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  created_at: string
}

export interface Family {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
}

export interface FamilyMember {
  id: string
  family_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface Post {
  id: string
  family_id: string
  user_id: string
  content: string
  type: 'cau-doi' | 'loi-chuc' | 'thiep-tet'
  created_at: string
}

export interface Reaction {
  id: string
  post_id: string
  user_id: string
  type: 'heart' | 'haha'
  created_at: string
}

export interface Event {
  id: string
  family_id: string
  title: string
  date: string
  location?: string
  created_by: string
  created_at: string
}

export interface EventTask {
  id: string
  event_id: string
  task: string
  assigned_to: string
  status: 'pending' | 'completed'
  created_at: string
}

export interface Photo {
  id: string
  family_id: string
  user_id: string
  url: string
  uploaded_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'event_reminder' | 'task_reminder'
  title: string
  content: string
  link?: string
  read: boolean
  created_at: string
}
