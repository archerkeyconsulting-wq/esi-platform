import { NextResponse } from 'next/server'

// Demo mode: auth is disabled. Middleware is kept as a no-op so re-enabling auth
// is a single-file swap rather than a restructure. The matcher is empty so this
// function does not execute on any request.
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
