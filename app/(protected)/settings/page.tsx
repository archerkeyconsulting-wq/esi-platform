import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  operating_partner: 'Operating Partner',
  gp: 'General Partner',
  read_only: 'Read-Only',
}

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('full_name, role, firm_id, created_at')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  const { data: firm } = profile?.firm_id
    ? await supabase
        .from('firms')
        .select('name')
        .eq('id', profile.firm_id)
        .maybeSingle()
    : { data: null }

  return (
    <div>
      <header className="mb-10">
        <div className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
          Settings
        </div>
        <h1 className="font-display text-5xl text-ink tracking-tight">Your profile</h1>
      </header>

      <div className="border-t border-b border-rule divide-y divide-rule/60">
        <Row label="Name" value={profile?.full_name ?? '—'} />
        <Row label="Email" value={user?.email ?? '—'} />
        <Row
          label="Role"
          value={profile ? ROLE_LABELS[profile.role] ?? profile.role : '—'}
        />
        <Row label="Firm" value={firm?.name ?? (profile?.role === 'super_admin' ? 'NARO Platform (all firms)' : '—')} />
        <Row
          label="Member Since"
          value={
            profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })
              : '—'
          }
        />
      </div>

      <p className="font-sans text-sm text-muted mt-8 max-w-2xl leading-relaxed">
        Need a password reset or profile change? Contact your administrator.
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-4 py-3">
      <div className="font-mono text-xs uppercase tracking-widest text-muted">
        {label}
      </div>
      <div className="font-sans text-sm text-ink">{value}</div>
    </div>
  )
}
