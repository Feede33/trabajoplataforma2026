'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Profile, UserRole } from '../supabase/database.types'
import { isSupabaseConfigured, createClient, resetClient } from '../supabase/client'
import { isProfileAdmin } from '../auth-utils'

interface AuthContextType {
  profile: Profile | null
  role: UserRole | null
  isAdmin: boolean
  isLoading: boolean
  isConfigured: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole; isAdmin?: boolean }>
  loginWithGoogle: (options?: { role?: UserRole; redirect?: string | null }) => Promise<{ success: boolean; error?: string }>
  signup: (
    email: string,
    password: string,
    targetRole: UserRole,
    nombre: string
  ) => Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean; message?: string }>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  getAccessToken: () => Promise<string | null>
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
            const meta = session.user.user_metadata || {}
            setProfile({
              id: session.user.id,
              role: (meta.role as UserRole) || 'candidato',
              nombre: meta.nombre || meta.full_name || meta.name || session.user.email?.split('@')[0] || '',
              email: session.user.email || '',
              avatar_url: meta.avatar_url || meta.picture || null,
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
              const meta = session.user.user_metadata || {}
              setProfile({
                id: session.user.id,
                role: (meta.role as UserRole) || 'candidato',
                nombre: meta.nombre || meta.full_name || meta.name || session.user.email?.split('@')[0] || '',
                email: session.user.email || '',
                avatar_url: meta.avatar_url || meta.picture || null,
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
  ): Promise<{ success: boolean; error?: string; role?: UserRole; isAdmin?: boolean }> => {
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

      const isCurrentlyAdmin = isProfileAdmin(p || { email: data.user.email })

      return { success: true, role: userRole, isAdmin: isCurrentlyAdmin }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al iniciar sesión' }
    }
  }

  const loginWithGoogle = async (options?: {
    role?: UserRole
    redirect?: string | null
  }): Promise<{ success: boolean; error?: string }> => {
    if (!isConfigured) {
      return { success: false, error: 'Supabase no está configurado en el archivo .env' }
    }

    try {
      const supabase = createClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const callbackUrl = new URL('/auth/callback', origin)

      if (options?.role === 'empresa' || options?.role === 'candidato') {
        callbackUrl.searchParams.set('role', options.role)
      }

      if (options?.redirect) {
        callbackUrl.searchParams.set('next', options.redirect)
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      })

      if (error) {
        return { success: false, error: error.message || 'Error al conectar con Google' }
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al iniciar sesión con Google' }
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

    // Regla de seguridad: Garantizar que el rol solo pueda ser 'empresa' o 'candidato'
    const sanitizedRole: UserRole = targetRole === 'empresa' ? 'empresa' : 'candidato'

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: sanitizedRole,
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
        role: sanitizedRole,
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
      resetClient()
    }
    setProfile(null)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('empleos_current_user')
        // Eliminar cookies de Supabase explícitamente en el navegador
        document.cookie.split(';').forEach((cookie) => {
          const eqPos = cookie.indexOf('=')
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
          if (name.startsWith('sb-')) {
            document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0`
          }
        })
      } catch {}
      // Redirigir al inicio con navegación completa para limpiar el Router Cache de Next.js
      window.location.href = '/'
    }
  }

  const getAccessToken = async (): Promise<string | null> => {
    if (!isConfigured) return null
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch {
      return null
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return
    const updated = { ...profile, ...updates, updated_at: new Date().toISOString() }

    if (isConfigured) {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .maybeSingle()
      if (error) {
        throw new Error(error.message || 'Error al actualizar el perfil en la base de datos')
      }
      if (data) {
        setProfile(data as Profile)
        return
      }
    }

    setProfile(updated)
  }

  const isAdmin = isProfileAdmin(profile)

  return (
    <AuthContext.Provider
      value={{
        profile,
        role: profile?.role || null,
        isAdmin,
        isLoading,
        isConfigured,
        login,
        loginWithGoogle,
        signup,
        logout,
        updateProfile,
        getAccessToken,
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
