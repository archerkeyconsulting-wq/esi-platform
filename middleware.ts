import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

const PROTECTED_PREFIXES = ['/dashboard', '/company', '/settings', '/admin']

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Rule 1: unauthenticated + protected route → /login
  if (!user && isProtected(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Rule 2: authenticated + on /login → /dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (user && isProtected(pathname)) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, role, firm_id')
      .eq('id', user.id)
      .maybeSingle()

    if (error || !profile) {
      // Auth user without a profile — log them out via redirect flow.
      return NextResponse.redirect(
        new URL('/error?reason=no-profile', request.url),
      )
    }

    // Rule 3: /admin only for super_admin
    if (pathname.startsWith('/admin') && profile.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Rule 4: GP users blocked from upload + company drill-in writes (still
    // read dashboard). For MVP, gp can browse company detail read-only.
    if (
      profile.role === 'gp' &&
      pathname.includes('/upload')
    ) {
      return NextResponse.redirect(
        new URL('/error?reason=unauthorized', request.url),
      )
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/company/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/login',
  ],
}
