'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Profile, UserRole } from '../supabase/database.types'
import { isSupabaseConfigured, createClient } from '../supabase/client'

interface AuthContextType {
  profile: Profile | null
  role: UserRole | null
  isLoading: boolean
  isConfigured: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>
  signup: (
    email: string,
    password: string,
    targetRole: UserRole,
    nombre: string
  ) => Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean; message?: string }>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isConfigured = isSupabaseConfigured()

  useEffect(() => {
    // Limpiar cualquier residuo de sesiones mock almacenadas previamente en el navegador
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('empleos_current_user')
      } catch {}
    }

    let authListener: { unsubscribe: () => void } | null = null

    async function initAuth() {
      if (!isConfigured) {
        setProfile(null)
        setIsLoading(false)
        return
      }

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
            // El usuario existe en auth.users pero el trigger aún no completó la fila en profiles
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
        } else {
          setProfile(null)
        }

        // Escuchar eventos en vivo de autenticación (LOGIN, LOGOUT, TOKEN REFRESH)
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
          } else {
            setProfile(null)
          }
        })
        authListener = subscription
      } catch (e) {
        console.error('Error al inicializar sesión con Supabase:', e)
        setProfile(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    return () => {
      authListener?.unsubscribe()
    }
  }, [isConfigured])

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    if (!isConfigured) {
      return { success: false, error: 'Supabase no está configurado en el archivo .env' }
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        return { success: false, error: error.message || 'Credenciales inválidas' }
      }

      if (!data.user) {
        return { success: false, error: 'No se encontró el usuario en el backend' }
      }

      // Buscar perfil real en la tabla profiles
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      let userRole: UserRole = 'candidato'

      if (p) {
        setProfile(p)
        userRole = p.role
      } else {
        userRole = (data.user.user_metadata?.role as UserRole) || 'candidato'
        const tempProfile: Profile = {
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
        }
        setProfile(tempProfile)
      }

      return { success: true, role: userRole }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al iniciar sesión' }
    }
  }

  const signup = async (
    email: string,
    password: string,
    targetRole: UserRole,
    nombre: string
  ): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean; message?: string }> => {
    if (!isConfigured) {
      return { success: false, error: 'Supabase no está configurado en el archivo .env' }
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: targetRole,
            nombre,
          },
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (!data.user) {
        return { success: false, error: 'Error al registrar el usuario en el backend' }
      }

      // Si Supabase requiere confirmación de email (data.session es null)
      if (!data.session) {
        return {
          success: true,
          requiresEmailConfirmation: true,
          message: '¡Cuenta creada! Por favor revisá tu casilla de correo electrónico para confirmar tu cuenta antes de iniciar sesión.',
        }
      }

      // Si la sesión se creó inmediatamente (confirmación de email desactivada)
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

      return { success: true, requiresEmailConfirmation: false }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al registrar la cuenta' }
    }
  }

  const logout = async () => {
    if (isConfigured) {
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch (err) {
        console.warn('Error durante el cierre de sesión en Supabase:', err)
      }
    }
    setProfile(null)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('empleos_current_user')
      } catch {}
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return
    const updated = { ...profile, ...updates, updated_at: new Date().toISOString() }

    if (isConfigured) {
      const supabase = createClient()
      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)
      if (error) {
        throw new Error(error.message || 'Error al actualizar el perfil en la base de datos')
      }
    }

    setProfile(updated)
  }

  return (
    <AuthContext.Provider
      value={{
        profile,
        role: profile?.role || null,
        isLoading,
        isConfigured,
        login,
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
