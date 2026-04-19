// Demo mode: admin routes are unlocked. Re-enable super_admin gating by
// restoring the prior auth.getUser() + profile role check.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
