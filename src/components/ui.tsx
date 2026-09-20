'use client'

/** Small shared controls. Everything here is tinted by the active theme's `ui` block. */
import type { ReactNode } from 'react'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="field-label">{label}</span>
        {hint && <span className="text-[11px] tabular-nums text-[var(--ui-muted)]">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  title?: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div
      role="radiogroup"
      className="flex gap-1 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-shell)]/60 p-1"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={[
              'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'bg-[var(--ui-accent)] text-[var(--ui-accent-ink)]'
                : 'text-[var(--ui-muted)] hover:bg-[var(--ui-border)]/60 hover:text-[var(--ui-text)]',
            ].join(' ')}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 ${className}`}
    >
      {children}
    </section>
  )
}
