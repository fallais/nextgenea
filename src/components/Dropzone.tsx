'use client'

import { useCallback, useRef, useState } from 'react'

interface DropzoneProps {
  onFile: (file: File) => void
  busy: boolean
  error: string | null
}

export function Dropzone({ onFile, busy, error }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [hover, setHover] = useState(false)

  const take = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-6 py-16">
      <div className="mb-10 space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--ui-text)]">
          Turn a GEDCOM into a poster
        </h1>
        <p className="max-w-lg text-[15px] leading-relaxed text-[var(--ui-muted)]">
          Drop a <code className="text-[var(--ui-accent)]">.ged</code> file to draw a printable
          ancestor chart. Choose a root person, a depth, a paper size and a theme, then export a
          vector PDF ready for the printer.
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setHover(true)
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(event) => {
          event.preventDefault()
          setHover(false)
          take(event.dataTransfer.files)
        }}
        disabled={busy}
        className={[
          'group relative flex w-full flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-colors',
          hover
            ? 'border-[var(--ui-accent)] bg-[var(--ui-accent)]/10'
            : 'border-[var(--ui-border)] bg-[var(--ui-panel)] hover:border-[var(--ui-accent)]/60',
          busy ? 'cursor-wait opacity-70' : 'cursor-pointer',
        ].join(' ')}
      >
        <svg
          viewBox="0 0 48 48"
          className="h-12 w-12 text-[var(--ui-accent)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M24 32V10m0 0-7 7m7-7 7 7" />
          <path d="M8 30v6a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4v-6" />
        </svg>

        <div className="space-y-1.5">
          <div className="text-base font-medium text-[var(--ui-text)]">
            {busy ? 'Reading your file…' : 'Drop a GEDCOM file here'}
          </div>
          <div className="text-[13px] text-[var(--ui-muted)]">
            or click to browse — .ged files
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".ged,.gedcom,text/plain"
          className="hidden"
          onChange={(event) => take(event.target.files)}
        />
      </button>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <p className="mt-8 flex items-center gap-2 text-[13px] text-[var(--ui-muted)]">
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 text-[var(--ui-accent)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M10 2.5 3.5 5.2v4.4c0 3.6 2.6 6.9 6.5 7.9 3.9-1 6.5-4.3 6.5-7.9V5.2z" />
          <path d="m7.4 10 1.9 1.9 3.5-3.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Your file is parsed in this browser tab and never uploaded anywhere.
      </p>
    </div>
  )
}
