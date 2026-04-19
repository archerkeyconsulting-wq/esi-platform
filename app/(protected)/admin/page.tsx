import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function AdminOverview() {
  const supabase = createClient()

  const [{ count: firmsCount }, { count: companiesCount }, { count: assessmentsCount }, { count: profilesCount }] =
    await Promise.all([
      supabase.from('firms').select('*', { count: 'exact', head: true }),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('assessments').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])

  return (
    <div>
      <header className="mb-10">
        <div className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
          Admin · Platform Overview
        </div>
        <h1 className="font-display text-5xl text-ink tracking-tight">
          Platform state
        </h1>
      </header>

      <section className="grid grid-cols-4 gap-6 mb-12 border-t border-b border-rule py-8">
        <Stat label="Firms" value={firmsCount ?? 0} />
        <Stat label="Companies" value={companiesCount ?? 0} />
        <Stat label="Assessments" value={assessmentsCount ?? 0} />
        <Stat label="Users" value={profilesCount ?? 0} />
      </section>

      <div className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
        Actions
      </div>

      <div className="border border-rule divide-y divide-rule/60">
        <AdminLink href="/admin/firms" title="Manage firms" description="Browse firms, view portfolio composition, and inspect users." />
      </div>

      <div className="mt-10 bg-signal-bg p-6 font-sans text-sm text-muted leading-relaxed max-w-3xl">
        User creation is manual. Create an auth user in the Supabase dashboard,
        then insert a row into the <code className="font-mono text-ink">profiles</code>{' '}
        table with the matching UUID, firm_id, and role.
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-mono text-5xl text-ink mb-2">{value}</div>
      <div className="font-mono text-xs uppercase tracking-widest text-muted">
        {label}
      </div>
    </div>
  )
}

function AdminLink({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="block px-5 py-4 hover:bg-signal-bg -mx-0"
    >
      <div className="font-sans font-medium text-sm text-ink">{title}</div>
      <div className="font-sans text-sm text-muted mt-1">{description}</div>
    </Link>
  )
}
