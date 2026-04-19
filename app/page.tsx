import Link from 'next/link'

export default function RootPage() {
  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="max-w-xl w-full text-center">
        <div className="mb-12">
          <h1 className="font-display text-7xl text-ink mb-2 tracking-tight">
            NARO
          </h1>
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            Portfolio Operational Intelligence
          </p>
        </div>

        <p className="font-sans text-base text-ink mb-12 leading-relaxed">
          Your board packages already contain operational signals.
          <br />
          NARO reads them so you do not have to.
        </p>

        <Link
          href="/login"
          className="inline-block bg-ink text-paper px-8 py-3 font-sans text-sm uppercase tracking-widest hover:bg-muted"
        >
          Sign In
        </Link>
      </div>
    </main>
  )
}
