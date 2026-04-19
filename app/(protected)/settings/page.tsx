export const revalidate = 0

// Demo mode: static profile view. Re-enable the Supabase-backed profile lookup
// by restoring auth.getUser() + profiles/firms queries.
export default function SettingsPage() {
  return (
    <div>
      <header className="mb-10">
        <div className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
          Settings
        </div>
        <h1 className="font-display text-5xl text-ink tracking-tight">Your profile</h1>
      </header>

      <div className="border-t border-b border-rule divide-y divide-rule/60">
        <Row label="Name" value="Demo User" />
        <Row label="Email" value="demo@archerridge.capital" />
        <Row label="Role" value="Operating Partner" />
        <Row label="Firm" value="Archer Ridge Capital" />
        <Row label="Member Since" value="April 2026" />
      </div>

      <p className="font-sans text-sm text-muted mt-8 max-w-2xl leading-relaxed">
        Demo mode — authentication is disabled. User management and profile
        editing will return when auth is re-enabled.
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
