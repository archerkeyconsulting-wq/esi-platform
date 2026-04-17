import { supabase } from './supabase'

export type UserRole = 'coo' | 'pe_sponsor' | 'admin' | 'user'

export interface CurrentUser {
  id: string
  email: string
  name: string
  global_role: string
  org_id?: string
  org_role?: UserRole
  organization?: {
    id: string
    name: string
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        global_role,
        organization_memberships(
          org_id,
          role,
          organizations(id, name)
        )
      `)
      .eq('id', user.id)
      .single()

    if (userError || !userRecord) {
      return null
    }

    const membership = userRecord.organization_memberships?.[0]

    return {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      global_role: userRecord.global_role,
      org_id: membership?.org_id,
      org_role: membership?.role as UserRole,
      organization: membership?.organizations,
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function signOut() {
  return await supabase.auth.signOut()
}

export function isAdmin(user: CurrentUser): boolean {
  return user.global_role === 'admin' || user.org_role === 'admin'
}

export function isCOO(user: CurrentUser): boolean {
  return user.org_role === 'coo'
}

export function isPESponsor(user: CurrentUser): boolean {
  return user.org_role === 'pe_sponsor'
}
