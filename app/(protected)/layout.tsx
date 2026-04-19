import { createClient } from '@/lib/supabase/server'
import { LeftRail, type LeftRailCompany } from '@/components/LeftRail'

// Demo mode: auth is disabled. The viewer is treated as an operating partner
// at Archer Ridge Capital — the only seeded firm. Re-enabling auth = restoring
// the prior auth.getUser() + profiles lookup block.
const DEMO_FIRM_NAME = 'Archer Ridge Capital'
const DEMO_USER_NAME = 'Demo User'
// super_admin so the admin section appears in the left rail for the walkthrough.
const DEMO_ROLE = 'super_admin'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

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
        firmName={DEMO_FIRM_NAME}
        companies={railCompanies}
        userName={DEMO_USER_NAME}
        role={DEMO_ROLE}
      />
      <main className="pl-[240px]" data-print-container>
        <div className="max-w-[1400px] mx-auto px-10 py-10">{children}</div>
      </main>
    </div>
  )
}
