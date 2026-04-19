import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeftRail, type LeftRailCompany } from '@/components/LeftRail'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, firm_id, full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/error?reason=no-profile')

  // Firm name — super_admin with no firm shows platform label.
  let firmName = 'NARO Platform'
  if (profile.firm_id) {
    const { data: firm } = await supabase
      .from('firms')
      .select('name')
      .eq('id', profile.firm_id)
      .maybeSingle()
    if (firm) firmName = firm.name
  }

  // Companies with their latest assessment score.
  const { data: companies } = await supabase
    .from('companies')
    .select('slug, name, id')
    .order('name', { ascending: true })

  const companyIds = (companies ?? []).map((c) => c.id)
  const scoresByCompany = new Map<
    string,
    { risk_score: number | null; status: LeftRailCompany['status'] }
  >()

  if (companyIds.length > 0) {
    const { data: assessments } = await supabase
      .from('assessments')
      .select('company_id, risk_score, status, created_at')
      .in('company_id', companyIds)
      .order('created_at', { ascending: false })

    for (const a of assessments ?? []) {
      if (!scoresByCompany.has(a.company_id)) {
        scoresByCompany.set(a.company_id, {
          risk_score: a.risk_score,
          status: a.status,
        })
      }
    }
  }

  const railCompanies: LeftRailCompany[] = (companies ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    risk_score: scoresByCompany.get(c.id)?.risk_score ?? null,
    status: scoresByCompany.get(c.id)?.status ?? null,
  }))

  return (
    <div className="min-h-screen bg-paper">
      <LeftRail
        firmName={firmName}
        companies={railCompanies}
        userName={profile.full_name ?? user.email ?? 'User'}
        role={profile.role}
      />
      <main className="pl-[240px]" data-print-container>
        <div className="max-w-[1400px] mx-auto px-10 py-10">{children}</div>
      </main>
    </div>
  )
}
