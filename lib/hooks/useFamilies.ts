'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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

        // Get families where user is a member
        const { data: memberData, error: memberError } = await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', userId)

        if (memberError) throw memberError

        if (!memberData || memberData.length === 0) {
          setFamilies([])
          setLoading(false)
          return
        }

        const familyIds = memberData.map((m) => m.family_id)

        // Get family details
        const { data: familiesData, error: familiesError } = await supabase
          .from('families')
          .select('*')
          .in('id', familyIds)
          .order('created_at', { ascending: false })

        if (familiesError) throw familiesError

        setFamilies(familiesData || [])
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
