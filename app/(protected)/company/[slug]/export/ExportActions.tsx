'use client'

import { useState } from 'react'

export function ExportActions({ plainText }: { plainText: string }) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(plainText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  function onPrint() {
    window.print()
  }

  return (
    <div className="flex gap-3 mb-8">
      <button
        onClick={onPrint}
        className="bg-ink text-paper px-6 py-2 font-sans text-sm uppercase tracking-widest hover:bg-muted"
      >
        Download PDF
      </button>
      <button
        onClick={onCopy}
        className="border border-ink text-ink px-6 py-2 font-sans text-sm uppercase tracking-widest hover:bg-ink hover:text-paper"
      >
        {copied ? 'Copied' : 'Copy to Clipboard'}
      </button>
    </div>
  )
}
