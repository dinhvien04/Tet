'use client'

import useSWR from 'swr'

export interface DashboardSummary {
  recentPosts: Array<{
    id: string
    content: string
    type: string
    createdAt: string
    author: { id: string; name: string; avatar: string | null } | null
  }>
  upcomingEvents: Array<{
    id: string
    title: string
    date: string
    location: string | null
  }>
  recentPhotos: Array<{
    id: string
    url: string
    uploadedAt: string
  }>
  pendingTaskCount: number
  unreadNotificationCount: number
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to load summary')
  }
  return res.json() as Promise<DashboardSummary>
}

export function useDashboardSummary(familyId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    familyId ? `/api/dashboard/summary?familyId=${familyId}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
    }
  )

  return {
    summary: data,
    isLoading,
    error,
    mutate,
  }
}
