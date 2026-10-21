'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Profile, UserRole } from '../supabase/database.types'
import { isSupabaseConfigured, createClient } from '../supabase/client'
import { MOCK_CANDIDATO, MOCK_EMPRESAS } from '../mock-data'

interface AuthContextType {
  profile: Profile | null
  role: UserRole | null
  isLoading: boolean
  isConfigured: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>
  loginDemo: (targetRole: UserRole) => void
  signup: (email: string, password: string, targetRole: UserRole, nombre: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LOCAL_STORAGE_USER_KEY = 'empleos_current_user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isConfigured = isSupabaseConfigured()

  useEffect(() => {
    let authListener: { unsubscribe: () => void } | null = null

    async function initAuth() {
      if (isConfigured) {
        try {
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (userProfile) {
              setProfile(userProfile)
            } else {
              setProfile({
                id: session.user.id,
                role: (session.user.user_metadata?.role as UserRole) || 'candidato',
                nombre: session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || '',
                email: session.user.email || '',
                avatar_url: null,
                bio: null,
                ubicacion: null,
                cv_url: null,
                website: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
            }
          }

          // Listen to live auth changes (login, signup, logout)
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()

              if (userProfile) {
                setProfile(userProfile)
              } else {
                setProfile({
                  id: session.user.id,
                  role: (session.user.user_metadata?.role as UserRole) || 'candidato',
                  nombre: session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || '',
                  email: session.user.email || '',
                  avatar_url: null,
                  bio: null,
                  ubicacion: null,
                  cv_url: null,
                  website: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
              }
            } else if (event === 'SIGNED_OUT') {
              setProfile(null)
            }
          })
          authListener = subscription
        } catch (e) {
          console.warn('Error reading Supabase session:', e)
        }
      }

      // Fallback: check localStorage for saved demo session
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY)
        if (saved) {
          setProfile(JSON.parse(saved))
        }
      } catch {}
      setIsLoading(false)
    }

    initAuth()

    return () => {
      authListener?.unsubscribe()
    }
  }, [isConfigured])

  const loginDemo = (targetRole: UserRole) => {
    const demoUser = targetRole === 'empresa' ? MOCK_EMPRESAS[0] : MOCK_CANDIDATO
    setProfile(demoUser)
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoUser))
    } catch {}
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    if (isConfigured) {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return { success: false, error: error.message }
        if (data.user) {
          const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
          let userRole: UserRole = 'candidato'
          if (p) {
            setProfile(p)
            userRole = p.role
          } else {
            userRole = (data.user.user_metadata?.role as UserRole) || 'candidato'
            setProfile({
              id: data.user.id,
              role: userRole,
              nombre: data.user.user_metadata?.nombre || data.user.email?.split('@')[0] || '',
              email: data.user.email || '',
              avatar_url: null,
              bio: null,
              ubicacion: null,
              cv_url: null,
              website: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }
          return { success: true, role: userRole }
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Error al iniciar sesión' }
      }
    }

    // Demo fallback: simulate login based on email
    const isCompany = email.toLowerCase().includes('empresa') || email.toLowerCase().includes('rrhh')
    const role: UserRole = isCompany ? 'empresa' : 'candidato'
    const user: Profile = {
      id: 'user-' + Date.now(),
      role,
      nombre: email.split('@')[0],
      email,
      avatar_url: isCompany ? MOCK_EMPRESAS[0].avatar_url : MOCK_CANDIDATO.avatar_url,
      bio: isCompany ? 'Empresa registrada' : 'Candidato en búsqueda de nuevas oportunidades',
      ubicacion: 'Argentina',
      cv_url: isCompany ? null : MOCK_CANDIDATO.cv_url,
      website: isCompany ? 'https://empresa.com' : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setProfile(user)
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user))
    } catch {}
    return { success: true, role }
  }

  const signup = async (email: string, password: string, targetRole: UserRole, nombre: string): Promise<{ success: boolean; error?: string }> => {
    if (isConfigured) {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: targetRole,
              nombre,
            }
          }
        })
        if (error) return { success: false, error: error.message }
        if (data.user) {
          const newProfile: Profile = {
            id: data.user.id,
            role: targetRole,
            nombre,
            email,
            avatar_url: null,
            bio: null,
            ubicacion: null,
            cv_url: null,
            website: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          setProfile(newProfile)
          return { success: true }
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Error al registrar usuario' }
      }
    }

    // Demo fallback
    const newProfile: Profile = {
      id: 'user-' + Date.now(),
      role: targetRole,
      nombre,
      email,
      avatar_url: null,
      bio: null,
      ubicacion: 'Argentina',
      cv_url: null,
      website: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setProfile(newProfile)
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newProfile))
    } catch {}
    return { success: true }
  }

  const logout = async () => {
    if (isConfigured) {
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch {}
    }
    setProfile(null)
    try {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
    } catch {}
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return
    const updated = { ...profile, ...updates, updated_at: new Date().toISOString() }

    if (isConfigured) {
      try {
        const supabase = createClient()
        await supabase.from('profiles').update(updates).eq('id', profile.id)
      } catch {}
    }

    setProfile(updated)
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(updated))
    } catch {}
  }

  return (
    <AuthContext.Provider
      value={{
        profile,
        role: profile?.role || null,
        isLoading,
        isConfigured,
        login,
        loginDemo,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
