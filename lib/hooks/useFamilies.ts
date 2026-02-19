'use client'

import { useEffect, useState } from 'react'
import { Family } from '@/types/database'

export function useFamilies(userId: string | undefined) {
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setFamilies([])
      setLoading(false)
      return
    }

    const fetchFamilies = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/families')
        
        if (!response.ok) {
          throw new Error('Failed to fetch families')
        }

        const data = await response.json()
        setFamilies(data.families || [])
      } catch (err) {
        console.error('Error fetching families:', err)
        setError('Không thể tải danh sách nhà')
      } finally {
        setLoading(false)
      }
    }

    fetchFamilies()
  }, [userId])

  return { families, loading, error }
}
