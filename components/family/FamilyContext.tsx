'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Family } from '@/types/database'
import { useFamilies } from '@/lib/hooks/useFamilies'
import { useAuth } from '@/components/auth/AuthProvider'

interface FamilyContextType {
  currentFamily: Family | null
  families: Family[]
  loading: boolean
  error: string | null
  setCurrentFamily: (family: Family) => void
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined)

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { families, loading, error } = useFamilies(user?.id)
  const [currentFamily, setCurrentFamilyState] = useState<Family | null>(null)

  // Auto-select first family when families load
  useEffect(() => {
    if (families.length > 0 && !currentFamily) {
      // Try to load from localStorage first
      const savedFamilyId = localStorage.getItem('currentFamilyId')
      const savedFamily = families.find((f) => f.id === savedFamilyId)
      
      if (savedFamily) {
        setCurrentFamilyState(savedFamily)
      } else {
        setCurrentFamilyState(families[0])
      }
    }
  }, [families, currentFamily])

  const setCurrentFamily = (family: Family) => {
    setCurrentFamilyState(family)
    localStorage.setItem('currentFamilyId', family.id)
  }

  return (
    <FamilyContext.Provider
      value={{
        currentFamily,
        families,
        loading,
        error,
        setCurrentFamily,
      }}
    >
      {children}
    </FamilyContext.Provider>
  )
}

export function useFamily() {
  const context = useContext(FamilyContext)
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider')
  }
  return context
}
