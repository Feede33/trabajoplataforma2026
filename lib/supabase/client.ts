import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient<any>> | null = null

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-supabase-project') && !url.includes('TU_PROYECTO')
}

export function createClient(): ReturnType<typeof createBrowserClient<any>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  if (!client) {
    client = createBrowserClient(url, key)
  }
  return client
}

export function resetClient() {
  client = null
}
