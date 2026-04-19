import { redirect } from 'next/navigation'

// Demo mode: login is disabled. Restore the prior email/password form by
// reverting this file.
export default function LoginPage() {
  redirect('/dashboard')
}
