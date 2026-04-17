export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            NARO
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Execution Intelligence Platform
          </p>
          <p className="text-lg text-slate-700 mb-12">
            Measure how execution breaks down inside your operations and quantify the financial impact.
          </p>

          <div className="flex gap-4 justify-center mb-16">
            <a
              href="/auth/login"
              className="btn-primary"
            >
              Sign In
            </a>
            <a
              href="/assessment/new"
              className="btn-secondary"
            >
              Start Assessment
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="metric-card">
              <div className="text-3xl font-bold text-brand-yellow mb-2">5</div>
              <div className="text-slate-600">Execution Signals Measured</div>
            </div>
            <div className="metric-card">
              <div className="text-3xl font-bold text-brand-yellow mb-2">30</div>
              <div className="text-slate-600">Questions in Assessment</div>
            </div>
            <div className="metric-card">
              <div className="text-3xl font-bold text-brand-yellow mb-2">1</div>
              <div className="text-slate-600">Composite Score</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
