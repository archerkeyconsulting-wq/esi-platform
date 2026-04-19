'use server'

import { redirect } from 'next/navigation'

// Demo mode: no auth to sign out of. Kept as a redirect so existing callers
// (LeftRail, etc.) continue to compile.
export async function signOut() {
  redirect('/dashboard')
}
