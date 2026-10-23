import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase credentials are not set, allow requests so UI can be tested
  if (!url || !key || url.includes('your-supabase-project')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      url,
      key,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Protect empresa routes
    if (request.nextUrl.pathname.startsWith('/empresa') && !user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Protect candidato routes
    if (request.nextUrl.pathname.startsWith('/candidato') && !user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Redirect logged-in users away from auth pages (except the OAuth callback handler)
    if (
      request.nextUrl.pathname.startsWith('/auth') &&
      !request.nextUrl.pathname.startsWith('/auth/callback') &&
      user
    ) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  } catch (error) {
    // If auth call fails, proceed gracefully
    return NextResponse.next({ request })
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/empresa/:path*', '/candidato/:path*', '/auth/:path*'],
}
