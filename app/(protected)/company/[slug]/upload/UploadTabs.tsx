'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { uploadCsv, uploadDocumentStub } from './actions'
import type { SignalType } from '@/lib/scoring/ors-lite'

type Tab = 'csv' | 'document'

interface SignalRow {
  signal_type: SignalType
  name: string
  description: string
  last_uploaded: string | null
}

export function UploadTabs({
  slug,
  rows,
}: {
  slug: string
  rows: SignalRow[]
}) {
  const [tab, setTab] = useState<Tab>('csv')

  return (
    <div>
      <div className="flex border-b border-rule mb-8">
        <TabButton active={tab === 'csv'} onClick={() => setTab('csv')}>
          CSV Upload
        </TabButton>
        <TabButton active={tab === 'document'} onClick={() => setTab('document')}>
          Document Upload
        </TabButton>
      </div>

      {tab === 'csv' && <CsvTab slug={slug} rows={rows} />}
      {tab === 'document' && <DocumentTab slug={slug} />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-6 py-3 font-mono text-xs uppercase tracking-widest -mb-px border-b-2',
        active
          ? 'border-ink text-ink'
          : 'border-transparent text-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function CsvTab({ slug, rows }: { slug: string; rows: SignalRow[] }) {
  return (
    <div>
      <p className="font-sans text-sm text-muted mb-6 max-w-3xl leading-relaxed">
        Upload structured CSV data for any signal. Each upload creates a new
        assessment that carries forward prior signal severities and replaces
        only the uploaded signal. Templates document the expected columns.
      </p>

      <div className="border border-rule divide-y divide-rule/60">
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr] gap-4 px-5 py-3 font-mono text-xs uppercase tracking-widest text-muted">
          <div>Signal</div>
          <div>Mapping Rule</div>
          <div>Last Upload</div>
          <div className="text-right">Upload</div>
        </div>

        {rows.map((row) => (
          <CsvRowControl key={row.signal_type} slug={slug} row={row} />
        ))}
      </div>
    </div>
  )
}

function CsvRowControl({ slug, row }: { slug: string; row: SignalRow }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  )
  const router = useRouter()

  function onSubmit(formData: FormData) {
    formData.set('slug', slug)
    formData.set('signal_type', row.signal_type)
    setMessage(null)
    startTransition(async () => {
      const result = await uploadCsv(formData)
      if (result.ok) {
        setMessage({
          ok: true,
          text: `Score recalculated: ${result.score}`,
        })
        router.refresh()
      } else {
        setMessage({ ok: false, text: result.error ?? 'Upload failed.' })
      }
    })
  }

  return (
    <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr] gap-4 px-5 py-4 items-center">
      <div>
        <div className="font-sans text-sm text-ink">{row.name}</div>
        <a
          href={`/csv-templates/${row.signal_type}.csv`}
          download
          className="font-mono text-xs uppercase tracking-widest text-muted hover:text-ink mt-1 inline-block"
        >
          ↓ Download Template
        </a>
      </div>
      <div className="font-sans text-xs text-muted leading-relaxed">
        {row.description}
      </div>
      <div className="font-mono text-xs text-muted">
        {row.last_uploaded
          ? new Date(row.last_uploaded).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '—'}
      </div>
      <form action={onSubmit} className="flex flex-col items-end gap-1">
        <label className="inline-block">
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            disabled={pending}
            className="block w-full text-xs font-sans text-ink
                       file:mr-3 file:py-1.5 file:px-3 file:border file:border-ink
                       file:bg-paper file:text-ink file:font-mono file:text-xs
                       file:uppercase file:tracking-widest file:cursor-pointer
                       hover:file:bg-ink hover:file:text-paper"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="bg-ink text-paper px-3 py-1 font-mono text-xs uppercase tracking-widest hover:bg-muted disabled:opacity-50"
        >
          {pending ? 'Processing…' : 'Upload'}
        </button>
        {message && (
          <div
            className={clsx(
              'font-mono text-xs mt-1',
              message.ok ? 'text-healthy' : 'text-elevated',
            )}
          >
            {message.text}
          </div>
        )}
      </form>
    </div>
  )
}

function DocumentTab({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  )

  function onSubmit(formData: FormData) {
    formData.set('slug', slug)
    setMessage(null)
    startTransition(async () => {
      const result = await uploadDocumentStub(formData)
      if (result.ok) {
        setMessage({
          ok: true,
          text: `Received ${result.filename}. Document processing — results pending.`,
        })
      } else {
        setMessage({ ok: false, text: result.error ?? 'Upload failed.' })
      }
    })
  }

  return (
    <div>
      <p className="font-sans text-sm text-muted mb-6 max-w-3xl leading-relaxed">
        Upload board packages, management reports, or operational memos.
        Accepted: PDF, Word, PowerPoint. <strong className="text-ink">MVP stub:</strong>{' '}
        files are stored but no signal extraction runs yet. The interface confirms
        receipt and surfaces a pending status.
      </p>

      <form
        action={onSubmit}
        className="border border-rule p-10 text-center max-w-2xl"
      >
        <input
          type="file"
          name="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf"
          required
          className="block w-full text-sm font-sans text-ink mb-4
                     file:mr-3 file:py-2 file:px-4 file:border file:border-ink
                     file:bg-paper file:text-ink file:font-mono file:text-xs
                     file:uppercase file:tracking-widest file:cursor-pointer
                     hover:file:bg-ink hover:file:text-paper"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-ink text-paper px-6 py-2 font-sans text-sm uppercase tracking-widest hover:bg-muted disabled:opacity-50"
        >
          {pending ? 'Uploading…' : 'Upload Document'}
        </button>
        {message && (
          <div
            className={clsx(
              'font-mono text-xs mt-4',
              message.ok ? 'text-healthy' : 'text-elevated',
            )}
          >
            {message.text}
          </div>
        )}
      </form>
    </div>
  )
}
