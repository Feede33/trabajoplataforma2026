'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { JobWithEmpresa } from '@/lib/supabase/database.types'
import { useAuth } from './AuthContext'
import {
  fetchSavedJobIds,
  fetchSavedJobs,
  toggleSavedJob as toggleSavedJobData,
} from '@/lib/data'

interface SavedJobsContextType {
  savedJobIds: Set<string>
  savedJobs: JobWithEmpresa[]
  loading: boolean
  isSaved: (jobId: string) => boolean
  toggleSave: (jobOrId: JobWithEmpresa | string, optionalJobData?: JobWithEmpresa) => Promise<boolean>
  refresh: () => Promise<void>
}

export const SavedJobsContext = createContext<SavedJobsContextType | undefined>(undefined)

export function SavedJobsProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set())
  const [savedJobs, setSavedJobs] = useState<JobWithEmpresa[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const loadData = useCallback(async () => {
    try {
      const candidatoId = profile?.role === 'candidato' ? profile.id : undefined
      const [ids, jobs] = await Promise.all([
        fetchSavedJobIds(candidatoId),
        fetchSavedJobs(candidatoId),
      ])
      setSavedJobIds(new Set(ids))
      setSavedJobs(jobs)
    } catch (err) {
      console.warn('Error loading saved jobs:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, profile?.role])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Listen to window custom event for sync across cards/components
  useEffect(() => {
    const handleSync = () => {
      loadData()
    }
    window.addEventListener('saved-jobs-updated', handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener('saved-jobs-updated', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [loadData])

  const isSaved = useCallback(
    (jobId: string) => {
      if (!jobId) return false
      return savedJobIds.has(jobId)
    },
    [savedJobIds]
  )

  const toggleSave = useCallback(
    async (jobOrId: JobWithEmpresa | string, optionalJobData?: JobWithEmpresa): Promise<boolean> => {
      const jobId = typeof jobOrId === 'string' ? jobOrId : jobOrId.id
      const jobData = typeof jobOrId === 'object' ? jobOrId : optionalJobData
      const candidatoId = profile?.role === 'candidato' ? profile.id : undefined

      const wasSaved = savedJobIds.has(jobId)
      const nextSaved = !wasSaved

      // Optimistic update
      setSavedJobIds((prev) => {
        const next = new Set(prev)
        if (nextSaved) {
          next.add(jobId)
        } else {
          next.delete(jobId)
        }
        return next
      })

      if (!nextSaved) {
        setSavedJobs((prev) => prev.filter((j) => j.id !== jobId))
      } else if (jobData) {
        setSavedJobs((prev) => {
          if (prev.some((j) => j.id === jobId)) return prev
          return [jobData, ...prev]
        })
      }

      try {
        const actualState = await toggleSavedJobData(jobId, candidatoId, jobData)

        // If actual state differs from optimistic, fix it
        if (actualState !== nextSaved) {
          setSavedJobIds((prev) => {
            const next = new Set(prev)
            if (actualState) next.add(jobId)
            else next.delete(jobId)
            return next
          })
        }

        // Notify other listeners
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('saved-jobs-updated'))
        }

        return actualState
      } catch (err) {
        console.error('Error toggling saved job:', err)
        // Rollback
        setSavedJobIds((prev) => {
          const next = new Set(prev)
          if (wasSaved) next.add(jobId)
          else next.delete(jobId)
          return next
        })
        return wasSaved
      }
    },
    [profile?.id, profile?.role, savedJobIds]
  )

  const value = useMemo(
    () => ({
      savedJobIds,
      savedJobs,
      loading,
      isSaved,
      toggleSave,
      refresh: loadData,
    }),
    [savedJobIds, savedJobs, loading, isSaved, toggleSave, loadData]
  )

  return <SavedJobsContext.Provider value={value}>{children}</SavedJobsContext.Provider>
}

export function useSavedJobs() {
  const context = useContext(SavedJobsContext)
  if (!context) {
    throw new Error('useSavedJobs must be used within a SavedJobsProvider')
  }
  return context
}
